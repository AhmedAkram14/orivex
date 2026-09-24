import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import { NotificationCategory } from '../../domain/enums/notification-category.enum.js';
import { NotificationEntityType } from '../../domain/enums/notification-entity-type.enum.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface AppointmentConfirmedEventPayload {
  appointmentId: string;
}

// [start, end) for the UTC calendar day containing `date` -- deliberately
// the same logic as DoctorAppointmentsController's own private
// `utcDayRange` (not exported/shared; duplicated here rather than reaching
// across the presentation layer from NotificationModule). Kept in sync by
// intent: both answer the identical question, "is this appointment part of
// today's queue".
function utcDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// A doctor previously had no way to learn a patient had actually arrived in
// their queue short of reloading the page -- ConfirmAppointmentUseCase
// (shared by both the Free-booking doctor-approval path and PaymentModule's
// paid-charge-success path, see that use case's own comment) opens the
// ConsultationSession into WaitingRoom, but nothing told the doctor. Reacts
// to ConsultationModule's already-published 'consultation.appointment.
// confirmed' event by name only, mirroring every other handler's
// cross-module boundary -- NotifyPatientOfAppointmentConfirmedHandler
// reacts to this same event for the patient's own "approved" notice.
//
// Scoped to appointments scheduled *today*: the event fires on confirmation
// regardless of how far out the appointment is, but DoctorAppointmentsController#getDoctorQueue
// only ever surfaces today's Confirmed/Completed appointments -- notifying
// the doctor "a patient is waiting" for a booking that won't appear in
// their queue for days would be exactly the kind of false action cue this
// module's own NotifyDoctorOfAppointmentRequestedHandler fix (Paid+Requested)
// was about eliminating, not reintroducing.
export class NotifyDoctorOfAppointmentConfirmedHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentConfirmedEventPayload): Promise<void> {
    try {
      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: event.appointmentId });
      if (!appointment) {
        return;
      }

      const { start, end } = utcDayRange(new Date());
      const scheduledAt = appointment.getScheduledAt();
      if (scheduledAt < start || scheduledAt >= end) {
        return;
      }

      const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: appointment.getDoctorId() });
      if (!doctorProfile) {
        return;
      }

      const patientProfile = await this.getPatientProfileByIdUseCase.execute({
        patientProfileId: appointment.getPatientId(),
      });
      const patientAccount = patientProfile
        ? await this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() })
        : null;

      const description = patientAccount
        ? `${patientAccount.getUserProfile().getDisplayName().toString()} is now waiting in your queue.`
        : 'A patient is now waiting in your queue.';

      const notification = Notification.create({
        accountId: doctorProfile.getAccountId(),
        title: 'Patient checked in',
        description,
        actionUrl: '/doctor/queue',
        category: NotificationCategory.Appointments,
        entityType: NotificationEntityType.Appointment,
        entityId: appointment.getId(),
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // ConfirmAppointmentUseCase, which has already saved the appointment
      // by the time domain events dispatch (same tolerance as every other
      // handler in this module).
      this.logger.error(
        "Failed to notify the doctor of a patient's queue arrival",
        error instanceof Error ? error.stack : String(error),
        { appointmentId: event.appointmentId },
      );
    }
  }
}
