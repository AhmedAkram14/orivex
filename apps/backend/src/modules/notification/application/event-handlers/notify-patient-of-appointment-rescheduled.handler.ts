import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface AppointmentRescheduledEventPayload {
  oldAppointmentId: string;
  newAppointmentId: string;
}

// Critical Lifecycle Gaps (Phase 3, Step 2): tells the patient their
// appointment moved to a new slot. Reacts to ConsultationModule's own
// 'consultation.appointment.rescheduled' event (only dispatched when the
// old appointment was Confirmed/paid) by name only, mirroring every other
// handler's cross-module boundary. The refund itself (if any) is handled
// separately by PaymentModule's AutoRefundOnAppointmentRescheduledHandler,
// which already gets its own "Refund issued" notification for free via the
// existing NotifyPatientOfRefundIssuedHandler once RefundPaymentUseCase
// dispatches RefundIssuedEvent -- this handler only announces the schedule
// change itself.
export class NotifyPatientOfAppointmentRescheduledHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentRescheduledEventPayload): Promise<void> {
    try {
      const newAppointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: event.newAppointmentId });
      if (!newAppointment) {
        return;
      }

      const patientProfile = await this.getPatientProfileByIdUseCase.execute({
        patientProfileId: newAppointment.getPatientId(),
      });
      if (!patientProfile) {
        return;
      }

      const notification = Notification.create({
        accountId: patientProfile.getAccountId(),
        title: 'Appointment rescheduled',
        description: 'Your appointment was rescheduled to a new time.',
        actionUrl: '/patient/appointments',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // RescheduleOrCancelAppointmentUseCase, which has already saved both
      // appointments by the time domain events dispatch (same tolerance as
      // every other handler in this module).
      this.logger.error(
        'Failed to notify the patient of an appointment reschedule',
        error instanceof Error ? error.stack : String(error),
        { oldAppointmentId: event.oldAppointmentId, newAppointmentId: event.newAppointmentId },
      );
    }
  }
}
