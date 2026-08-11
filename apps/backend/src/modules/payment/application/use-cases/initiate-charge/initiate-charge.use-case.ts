import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { AppointmentStatus } from '../../../../consultation/domain/enums/appointment-status.enum.js';
import { ConfirmAppointmentCommand } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.command.js';
import type { ConfirmAppointmentUseCase } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import type { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { IdempotencyKeyConflictError } from '../../../domain/exceptions/idempotency-key-conflict.error.js';
import { PaymentAuthorizationFailedError } from '../../../domain/exceptions/payment-authorization-failed.error.js';
import { PaymentDomainError } from '../../../domain/exceptions/payment-domain.error.js';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port.js';

import type { InitiateChargeCommand } from './initiate-charge.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// payment.module.ts only.
//
// Consultation Pricing Lifecycle Completion (pay-then-confirm): charges
// against the Appointment directly, not a ConsultationSession. This closes
// a real gap the previous design had -- a session was only ever opened by
// ConfirmAppointmentUseCase, and confirmation for a Paid appointment was
// only ever supposed to happen via a successful charge, so a
// consultationSessionId-keyed charge could never actually be initiated for
// a Requested Paid appointment (nothing existed yet to charge against).
//
// Orchestrates: resolve the Appointment (via ConsultationModule's own
// exported use case -- module-to-module calls only through a published
// interface, never another module's repository) -> validate it is still
// Requested and genuinely Paid, with an amount/currency that matches its
// own snapshotted pricing (frozen at booking time from the
// AvailabilityWindow that was booked -- never DoctorProfile.
// consultationFeeAmount, closing the "client could request an arbitrary
// charge amount" gap) -> persist an Initiated PaymentTransaction -> call
// PaymentGatewayPort (the documented "external PSP adapter",
// docs/10-backend-architecture.md) -> record Succeeded/Failed -> on
// success, confirm the Appointment via ConsultationModule's exported
// ConfirmAppointmentUseCase, which opens the ConsultationSession for the
// first time. If confirmation fails after a successful charge (e.g. the
// slot's hold lapsed while the patient was paying, or a race with another
// charge attempt using a different idempotency key), the charge is
// automatically refunded rather than leaving a Succeeded transaction
// against an appointment nobody can ever use -- docs/01-prd.md's own
// "technical-failure auto-refund" policy, the one unambiguous automatic-
// refund case that policy already documents.
export class InitiateChargeUseCase {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(command: InitiateChargeCommand): Promise<PaymentTransaction> {
    const existing = await this.paymentTransactionRepository.findByIdempotencyKey(command.idempotencyKey);
    if (existing) {
      return this.replay(existing, command);
    }

    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: command.appointmentId });
    if (!appointment) {
      throw new NotFoundError(`Appointment "${command.appointmentId}" not found.`);
    }

    if (appointment.getStatus() !== AppointmentStatus.Requested) {
      throw new PaymentDomainError(
        `Appointment "${command.appointmentId}" is not awaiting payment (status: ${appointment.getStatus()}).`,
      );
    }

    const pricing = appointment.getPricing();
    if (pricing.isFree()) {
      throw new PaymentDomainError('This consultation is free; no charge can be initiated for it.');
    }

    const consultationFee = pricing.getFee();
    if (!consultationFee) {
      throw new PaymentDomainError('This appointment has no configured consultation fee; a charge cannot be initiated.');
    }
    if (command.amount !== consultationFee.getAmount()) {
      throw new PaymentDomainError(
        `Requested amount ${command.amount} does not match this appointment's consultation fee ${consultationFee.getAmount()}.`,
      );
    }
    if (command.currency.trim().toUpperCase() !== consultationFee.getCurrency()) {
      throw new PaymentDomainError(
        `Requested currency ${command.currency} does not match this appointment's consultation fee currency ${consultationFee.getCurrency()}.`,
      );
    }

    const amount = Money.create(command.amount, command.currency);
    const transaction = PaymentTransaction.initiate({
      idempotencyKey: command.idempotencyKey,
      appointmentId: command.appointmentId,
      patientId: appointment.getPatientId(),
      doctorId: appointment.getDoctorId(),
      amount,
      paymentMethod: command.paymentMethod,
    });
    await this.paymentTransactionRepository.save(transaction);

    const result = await this.paymentGateway.authorize({
      amount: amount.getAmount(),
      currency: amount.getCurrency(),
      paymentMethod: command.paymentMethod,
      paymentMethodToken: command.paymentMethodToken,
    });

    if (result.externalReference) {
      transaction.attachExternalReference(result.externalReference);
    }

    if (!result.succeeded) {
      transaction.markFailed();
      await this.paymentTransactionRepository.save(transaction);
      throw new PaymentAuthorizationFailedError('Payment authorization failed.');
    }

    transaction.markSucceeded();
    await this.paymentTransactionRepository.save(transaction);
    await this.eventDispatcher.dispatch(transaction.releaseDomainEvents());

    try {
      const { session } = await this.confirmAppointmentUseCase.execute(
        new ConfirmAppointmentCommand({ appointmentId: appointment.getId() }),
      );
      transaction.attachConsultationSessionId(session.getId());
      await this.paymentTransactionRepository.save(transaction);
    } catch {
      // The charge genuinely succeeded but the appointment could no longer
      // be confirmed (most likely its slot's hold lapsed, or a concurrent
      // charge attempt against the same appointment won the race first) --
      // never leave a Succeeded transaction stranded against an appointment
      // that can't be used. Auto-refund and surface a clear error instead.
      // Guarded: refund() itself throws if no externalReference was ever
      // attached (a gateway that never returns one) -- still surface the
      // same clear error in that case rather than an unhandled crash, since
      // the transaction is left Succeeded either way for manual follow-up.
      try {
        transaction.refund();
        const externalReference = transaction.getExternalReference();
        if (externalReference) {
          await this.paymentGateway.refund({ externalReference });
        }
        await this.paymentTransactionRepository.save(transaction);
        await this.eventDispatcher.dispatch(transaction.releaseDomainEvents());
      } catch {
        // Already Succeeded and saved above; nothing further to persist.
      }
      throw new PaymentDomainError(
        'This appointment could no longer be confirmed (its slot may no longer be available). Your payment has been automatically refunded.',
      );
    }

    return transaction;
  }

  // A request reusing an idempotency key never re-runs the charge -- it
  // either replays the original outcome (same params) or rejects a key
  // reused with different params (a client bug, not a legitimate retry).
  private replay(existing: PaymentTransaction, command: InitiateChargeCommand): PaymentTransaction {
    const sameRequest =
      existing.getAppointmentId() === command.appointmentId &&
      existing.getAmount().getAmount() === command.amount &&
      existing.getAmount().getCurrency() === command.currency &&
      existing.getPaymentMethod() === command.paymentMethod;

    if (!sameRequest) {
      throw new IdempotencyKeyConflictError(
        `Idempotency key "${command.idempotencyKey}" was already used for a different request.`,
      );
    }

    if (existing.getStatus() === PaymentStatus.Failed) {
      throw new PaymentAuthorizationFailedError('Payment authorization failed.');
    }

    return existing;
  }
}
