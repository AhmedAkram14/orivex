import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
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
              }),
            )
          : Promise.resolve(),
        doctorProfile
          ? this.notificationRepository.save(
              Notification.create({
                accountId: doctorProfile.getAccountId(),
                title: 'Consultation interrupted',
                description: 'A consultation was interrupted before it could be completed.',
                actionUrl: '/doctor/queue',
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
