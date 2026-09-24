import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import { NotificationCategory } from '../../domain/enums/notification-category.enum.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface ConsultationInterruptedEventPayload {
  consultationSessionId: string;
}

// Neither party previously had any notification that a consultation ended
// as an interruption (a technical problem) rather than a genuine
// completion -- ConsultationInterruptedEvent has existed since the
// consultation-lifecycle work but nothing ever subscribed to it. Notifies
// both patient and doctor, unlike NotifyConsultationCompletedHandler's
// patient-only fan-out: an interruption is ambiguous about who was
// present when it happened, so both sides need to know the visit didn't
// reach a real completion and may need to be resumed/rescheduled.
export class NotifyOfConsultationInterruptedHandler {
  constructor(
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: ConsultationInterruptedEventPayload): Promise<void> {
    try {
      const session = await this.getConsultationSessionByIdUseCase.execute({
        consultationSessionId: event.consultationSessionId,
      });
      if (!session) {
        return;
      }

      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
      if (!appointment) {
        return;
      }

      const description = 'Your consultation was interrupted before it could be completed.';
      const [patientProfile, doctorProfile] = await Promise.all([
        this.getPatientProfileByIdUseCase.execute({ patientProfileId: appointment.getPatientId() }),
        this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: appointment.getDoctorId() }),
      ]);

      await Promise.all([
        patientProfile
          ? this.notificationRepository.save(
              Notification.create({
                accountId: patientProfile.getAccountId(),
                title: 'Consultation interrupted',
                description,
                actionUrl: '/patient/appointments',
                category: NotificationCategory.Appointments,
              }),
            )
          : Promise.resolve(),
        // Phase 5 (Notifications, Navigation & IA): no structured
        // entity-id/patient-name field exists on Notification today (see
        // IMPLEMENTATION_NOTES.md's Phase 0 finding (e) and the backend
        // proposal below) -- this description deliberately still names no
        // patient rather than fragile-parse one out of free text. The
        // deep link is fixable without any new field, though: this handler
        // already has the real appointment id in scope, so it now points
        // straight at that appointment on `/doctor/appointments` (added in
        // Phase 2) instead of the today-only Queue, which very often no
        // longer shows the interrupted visit by the time the doctor clicks.
        doctorProfile
          ? this.notificationRepository.save(
              Notification.create({
                accountId: doctorProfile.getAccountId(),
                title: 'Consultation interrupted',
                description: 'A consultation was interrupted before it could be completed.',
                actionUrl: `/doctor/appointments?highlight=${appointment.getId()}`,
                category: NotificationCategory.Appointments,
              }),
            )
          : Promise.resolve(),
      ]);
    } catch (error) {
      // A notification failure must never surface back through
      // CloseConsultationUseCase, which has already saved the session by
      // the time domain events dispatch (same tolerance as every other
      // handler in this module).
      this.logger.error(
        'Failed to notify participants of an interrupted consultation',
        error instanceof Error ? error.stack : String(error),
        { consultationSessionId: event.consultationSessionId },
      );
    }
  }
}
