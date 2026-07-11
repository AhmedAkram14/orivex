import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { ConfirmAppointmentCommand } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.command.js';
import type { ConfirmAppointmentUseCase } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import type { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentAuthorizationFailedError } from '../../../domain/exceptions/payment-authorization-failed.error.js';
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
export class InitiateChargeUseCase {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(command: InitiateChargeCommand): Promise<PaymentTransaction> {
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

    const amount = Money.create(command.amount, command.currency);
    const transaction = PaymentTransaction.initiate({
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
}
