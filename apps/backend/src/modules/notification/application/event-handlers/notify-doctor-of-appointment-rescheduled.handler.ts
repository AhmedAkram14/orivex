import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface DoctorAppointmentRescheduledEventPayload {
  oldAppointmentId: string;
  newAppointmentId: string;
  rescheduledByRole: 'doctor' | 'patient';
}

// The counterpart to NotifyPatientOfAppointmentRescheduledHandler, which only
// ever notified the patient. Reacts to the same
// 'consultation.appointment.rescheduled' event by name only (the dispatcher
// supports multiple handlers per event) -- only when rescheduledByRole ===
// 'patient', so a doctor who reschedules their own patient's appointment is
// never notified of their own action. Same event-dispatch gating as the
// patient-facing handler (only fires when the old appointment being
// superseded was Confirmed/paid -- see AppointmentRescheduledEvent's own
// comment), so this handler shares that same limitation for free
// reschedules, consistent with the existing patient notification.
export class NotifyDoctorOfAppointmentRescheduledHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: DoctorAppointmentRescheduledEventPayload): Promise<void> {
    if (event.rescheduledByRole !== 'patient') {
      return;
    }
    try {
      const newAppointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: event.newAppointmentId });
      if (!newAppointment) {
        return;
      }

      const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({
        doctorProfileId: newAppointment.getDoctorId(),
      });
      if (!doctorProfile) {
        return;
      }

      const notification = Notification.create({
        accountId: doctorProfile.getAccountId(),
        title: 'Appointment rescheduled',
        description: 'A patient rescheduled their appointment with you to a new time.',
        actionUrl: '/doctor/queue',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // RescheduleOrCancelAppointmentUseCase, which has already saved both
      // appointments by the time domain events dispatch (same tolerance as
      // every other handler in this module).
      this.logger.error(
        'Failed to notify the doctor of a patient-initiated appointment reschedule',
        error instanceof Error ? error.stack : String(error),
        { oldAppointmentId: event.oldAppointmentId, newAppointmentId: event.newAppointmentId },
      );
    }
  }
}
