import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface DoctorAppointmentCancelledEventPayload {
  appointmentId: string;
  cancelledBy: 'doctor' | 'patient';
}

// The counterpart to NotifyPatientOfAppointmentCancelledHandler, which only
// ever notified the patient. A doctor previously had no way to learn a
// patient had cancelled short of noticing it missing from their queue.
// Reacts to the same 'consultation.appointment.cancelled' event by name
// only (the dispatcher supports multiple handlers per event) -- only when
// cancelledBy === 'patient', so a doctor who cancels their own appointment
// is never notified of their own action.
export class NotifyDoctorOfAppointmentCancelledHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: DoctorAppointmentCancelledEventPayload): Promise<void> {
    if (event.cancelledBy !== 'patient') {
      return;
    }
    try {
      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: event.appointmentId });
      if (!appointment) {
        return;
      }

      const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: appointment.getDoctorId() });
      if (!doctorProfile) {
        return;
      }

      const notification = Notification.create({
        accountId: doctorProfile.getAccountId(),
        title: 'Appointment cancelled',
        description: 'A patient cancelled their appointment with you.',
        actionUrl: '/doctor/queue',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // RescheduleOrCancelAppointmentUseCase, which has already saved the
      // appointment by the time domain events dispatch (same tolerance as
      // every other handler in this module).
      this.logger.error(
        'Failed to notify the doctor of a patient-initiated appointment cancellation',
        error instanceof Error ? error.stack : String(error),
        { appointmentId: event.appointmentId },
      );
    }
  }
}
