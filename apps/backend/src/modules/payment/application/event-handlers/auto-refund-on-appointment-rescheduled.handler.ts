import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import type { PaymentTransactionRepository } from '../../domain/repositories/payment-transaction.repository.js';
import { RefundPaymentCommand } from '../use-cases/refund-payment/refund-payment.command.js';
import type { RefundPaymentUseCase } from '../use-cases/refund-payment/refund-payment.use-case.js';

export interface AppointmentRescheduledEventPayload {
  oldAppointmentId: string;
  newAppointmentId: string;
}

// Critical Lifecycle Gaps (Phase 3, Step 2). PaymentModule reacting to
// ConsultationModule's 'consultation.appointment.rescheduled' event by name
// only (mirrors AutoRefundOnAppointmentCancellationHandler / DoctorModule's
// PromoteDoctorRoleOnVerificationHandler -- never import the emitting
// module's event type or the module itself).
//
// ConsultationModule only ever dispatches this event when the OLD
// appointment was Confirmed (had a real, already-charged payment), so this
// handler's job is a thin lookup-and-refund: find the old appointment's
// PaymentTransaction and hand it to the EXISTING RefundPaymentUseCase --
// no refund logic is duplicated here. Still defensively re-checks the
// transaction exists and is in a refundable state rather than assuming the
// dispatch-time gate is airtight (a Confirmed appointment SHOULD always
// have a Succeeded/Settled transaction per the existing charge flow, but a
// missing/already-refunded one must no-op, not throw).
//
// Idempotency: PaymentTransaction.refund()'s own domain guard only allows
// Succeeded|Settled -> Refunded and throws otherwise, so a replayed
// AppointmentRescheduledEvent hitting an already-Refunded transaction would
// throw from inside RefundPaymentUseCase -- caught below and logged, same
// swallow-and-log philosophy as AutoRefundOnAppointmentCancellationHandler,
// never surfaced back to the caller.
export class AutoRefundOnAppointmentRescheduledHandler {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentRescheduledEventPayload): Promise<void> {
    try {
      const transaction = await this.paymentTransactionRepository.findByAppointmentId(event.oldAppointmentId);
      if (!transaction) {
        return;
      }
      if (transaction.getStatus() !== PaymentStatus.Succeeded && transaction.getStatus() !== PaymentStatus.Settled) {
        return;
      }

      await this.refundPaymentUseCase.execute(new RefundPaymentCommand({ paymentTransactionId: transaction.getId() }));
    } catch (error) {
      // The reschedule itself has already been saved by the time domain
      // events dispatch -- a refund failure here must never surface as a
      // failed reschedule request. Surfaced loudly in logs instead, since a
      // patient owed a refund that didn't happen needs someone to notice.
      this.logger.error('Failed to auto-refund the old payment for a rescheduled appointment', {
        oldAppointmentId: event.oldAppointmentId,
        newAppointmentId: event.newAppointmentId,
        error: error instanceof Error ? error.stack : String(error),
      });
    }
  }
}
