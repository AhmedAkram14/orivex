import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { ConfirmAppointmentCommand } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.command.js';
import type { ConfirmAppointmentUseCase } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import type { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ConsultationType } from '../../../../consultation/domain/enums/consultation-type.enum.js';
import type { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
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
// Orchestrates: resolve the ConsultationSession -> its Appointment (via
// ConsultationModule's own exported use cases -- module-to-module calls
// only through a published interface, never another module's repository)
// -> persist an Initiated PaymentTransaction -> call PaymentGatewayPort
// (the documented "external PSP adapter", docs/10-backend-architecture.md)
// -> record Succeeded/Failed -> on success, confirm the Appointment via
// ConsultationModule's exported ConfirmAppointmentUseCase (the "Consultation
// integration" this sprint's scope). PaymentGatewayPort has no bound
// provider this sprint (no PSP selected) -- this use case still calls it
// for real; it is simply not wired into the running application yet.
//
// command.amount is validated against the doctor's own
// consultationFeeAmount (DoctorModule's own data, via its published
// GetDoctorProfileByIdUseCase) rather than trusted as-is -- a client
// could otherwise request an arbitrary charge amount for any real
// consultationSessionId. Currency is still client-supplied: DoctorProfile
// has no currency field of its own yet (Egypt V1 is single-currency in
// practice, but nothing in the domain model enforces that), a known,
// narrower gap than the amount one this closes.
export class InitiateChargeUseCase {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(command: InitiateChargeCommand): Promise<PaymentTransaction> {
    const existing = await this.paymentTransactionRepository.findByIdempotencyKey(command.idempotencyKey);
    if (existing) {
      return this.replay(existing, command);
    }

    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: command.consultationSessionId,
    });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    if (appointment.getConsultationType() === ConsultationType.Free) {
      throw new PaymentDomainError('This consultation is free; no charge can be initiated for it.');
    }

    const doctor = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: appointment.getDoctorId() });
    if (!doctor) {
      throw new NotFoundError(`Doctor profile "${appointment.getDoctorId()}" not found.`);
    }
    const consultationFeeAmount = doctor.getConsultationFeeAmount();
    if (consultationFeeAmount === undefined) {
      throw new PaymentDomainError('This doctor has no configured consultation fee; a charge cannot be initiated.');
    }
    if (command.amount !== consultationFeeAmount) {
      throw new PaymentDomainError(
        `Requested amount ${command.amount} does not match the doctor's consultation fee ${consultationFeeAmount}.`,
      );
    }

    const amount = Money.create(command.amount, command.currency);
    const transaction = PaymentTransaction.initiate({
      idempotencyKey: command.idempotencyKey,
      consultationSessionId: command.consultationSessionId,
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
    });

    if (!result.succeeded) {
      transaction.markFailed();
      await this.paymentTransactionRepository.save(transaction);
      throw new PaymentAuthorizationFailedError('Payment authorization failed.');
    }

    transaction.markSucceeded();
    await this.paymentTransactionRepository.save(transaction);
    await this.eventDispatcher.dispatch(transaction.releaseDomainEvents());

    await this.confirmAppointmentUseCase.execute(new ConfirmAppointmentCommand({ appointmentId: appointment.getId() }));

    return transaction;
  }

  // A request reusing an idempotency key never re-runs the charge -- it
  // either replays the original outcome (same params) or rejects a key
  // reused with different params (a client bug, not a legitimate retry).
  private replay(existing: PaymentTransaction, command: InitiateChargeCommand): PaymentTransaction {
    const sameRequest =
      existing.getConsultationSessionId() === command.consultationSessionId &&
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
