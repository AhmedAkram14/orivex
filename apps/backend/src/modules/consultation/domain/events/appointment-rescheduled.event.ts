import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Critical Lifecycle Gaps (Phase 3, Step 2): dispatched only when the OLD
// appointment being superseded was Confirmed (i.e., had a real, already-
// charged payment) -- a reschedule away from a still-Requested (unpaid) or
// free appointment carries no money to unwind, so no event fires for those
// cases (gated at dispatch time in RescheduleOrCancelAppointmentUseCase).
//
// PaymentModule's own event handler (AutoRefundOnAppointmentRescheduledHandler)
// resolves oldAppointmentId -> PaymentTransaction via the existing
// findByAppointmentId lookup and refunds it through the existing
// RefundPaymentUseCase -- mirrors how AppointmentCancelledEvent already
// flows to AutoRefundOnAppointmentCancellationHandler. ConsultationModule never
// imports PaymentModule; the event name is the only coupling.
//
// `rescheduledByRole` mirrors AppointmentCancelledEvent's `cancelledBy` --
// the same /appointments/:id PATCH endpoint lets either the owning doctor or
// the owning patient reschedule, so NotificationModule needs this to notify
// the OTHER party without ever notifying the initiator of their own action.
export class AppointmentRescheduledEvent extends DomainEvent {
  readonly eventName = 'consultation.appointment.rescheduled';

  constructor(
    public readonly oldAppointmentId: string,
    public readonly newAppointmentId: string,
    public readonly rescheduledByRole: 'doctor' | 'patient',
  ) {
    super();
  }
}
