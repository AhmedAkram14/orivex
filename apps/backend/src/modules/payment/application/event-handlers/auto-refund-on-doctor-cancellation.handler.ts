import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../domain/repositories/payment-transaction.repository.js';
import { RefundPaymentCommand } from '../use-cases/refund-payment/refund-payment.command.js';
import type { RefundPaymentUseCase } from '../use-cases/refund-payment/refund-payment.use-case.js';

export interface AppointmentCancelledEventPayload {
  appointmentId: string;
  cancelledBy: 'doctor' | 'patient';
}

// Consultation Pricing Lifecycle Completion. PaymentModule reacting to
// ConsultationModule's already-published 'consultation.appointment.cancelled'
// event by name only (mirrors DoctorModule's
// PromoteDoctorRoleOnVerificationHandler / NotificationModule's handlers --
// never import the emitting module's event type or the module itself).
//
// Applies the one automatic-refund rule the product decision authorized:
// doctor-initiated cancellation of an appointment that was actually charged
// = always full refund (docs/01-prd.md's unambiguous rule). Patient-
// initiated cancellation is deliberately left alone here -- no time-based
// cutoff/partial-refund policy exists yet (the PRD never specifies the
// cutoff or the percentage), and inventing one is explicitly out of scope;
// that remains a manual doctor-triggered refund via POST /payments/:id/refund
// until a real policy is defined.
export class AutoRefundOnDoctorCancellationHandler {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentCancelledEventPayload): Promise<void> {
    if (event.cancelledBy !== 'doctor') {
      return;
    }

    try {
      const transaction = await this.paymentTransactionRepository.findByAppointmentId(event.appointmentId);
      if (!transaction) {
        return;
      }
      if (transaction.getStatus() !== PaymentStatus.Succeeded && transaction.getStatus() !== PaymentStatus.Settled) {
        return;
      }

      await this.refundPaymentUseCase.execute(new RefundPaymentCommand({ paymentTransactionId: transaction.getId() }));
    } catch (error) {
      // The cancellation itself has already been saved by the time domain
      // events dispatch -- a refund failure here must never surface as a
      // failed cancellation request. Surfaced loudly in logs instead, since
      // a patient owed a refund that didn't happen needs someone to notice.
      this.logger.error('Failed to auto-refund a doctor-cancelled paid appointment', {
        appointmentId: event.appointmentId,
        error: error instanceof Error ? error.stack : String(error),
      });
    }
  }
}
