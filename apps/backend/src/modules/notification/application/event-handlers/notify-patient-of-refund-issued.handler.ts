import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { GetPaymentTransactionByIdUseCase } from '../../../payment/application/use-cases/get-payment-transaction-by-id/get-payment-transaction-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface RefundIssuedEventPayload {
  paymentTransactionId: string;
}

// A patient who was refunded previously had no notification of it at all --
// RefundIssuedEvent has existed since PaymentModule's own Stage 1 work but
// nothing ever subscribed to it. NotificationModule reacting to it by name
// only, mirroring every other handler's cross-module boundary.
export class NotifyPatientOfRefundIssuedHandler {
  constructor(
    private readonly getPaymentTransactionByIdUseCase: GetPaymentTransactionByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: RefundIssuedEventPayload): Promise<void> {
    try {
      const transaction = await this.getPaymentTransactionByIdUseCase.execute({
        paymentTransactionId: event.paymentTransactionId,
      });
      if (!transaction) {
        return;
      }

      const patientProfile = await this.getPatientProfileByIdUseCase.execute({
        patientProfileId: transaction.getPatientId(),
      });
      if (!patientProfile) {
        return;
      }

      const amount = transaction.getAmount();
      const notification = Notification.create({
        accountId: patientProfile.getAccountId(),
        title: 'Refund issued',
        description: `You were refunded ${amount.getAmount()} ${amount.getCurrency()}.`,
        actionUrl: '/patient/appointments',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // RefundPaymentUseCase, which has already saved the transaction by
      // the time domain events dispatch (same tolerance as every other
      // handler in this module).
      this.logger.error(
        'Failed to notify the patient of an issued refund',
        error instanceof Error ? error.stack : String(error),
        { paymentTransactionId: event.paymentTransactionId },
      );
    }
  }
}
