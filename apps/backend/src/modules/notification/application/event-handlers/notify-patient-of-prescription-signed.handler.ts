import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import type { GetPrescriptionByIdUseCase } from '../../../clinical/application/use-cases/get-prescription-by-id/get-prescription-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface PrescriptionSignedEventPayload {
  prescriptionId: string;
}

// A patient whose doctor signed a prescription previously had no
// notification of it at all -- PrescriptionSignedEvent has existed since
// ClinicalModule's own Stage work but nothing ever subscribed to it.
// NotificationModule reacting to it by name only, mirroring every other
// handler's cross-module boundary. Prescription itself carries no
// patientId directly -- resolved via its ConsultationSession's Appointment,
// the same chain NotifyConsultationCompletedHandler already establishes.
export class NotifyPatientOfPrescriptionSignedHandler {
  constructor(
    private readonly getPrescriptionByIdUseCase: GetPrescriptionByIdUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: PrescriptionSignedEventPayload): Promise<void> {
    try {
      const prescription = await this.getPrescriptionByIdUseCase.execute({ prescriptionId: event.prescriptionId });
      if (!prescription) {
        return;
      }

      const session = await this.getConsultationSessionByIdUseCase.execute({
        consultationSessionId: prescription.getConsultationSessionId(),
      });
      if (!session) {
        return;
      }

      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
      if (!appointment) {
        return;
      }

      const patientProfile = await this.getPatientProfileByIdUseCase.execute({
        patientProfileId: appointment.getPatientId(),
      });
      if (!patientProfile) {
        return;
      }

      const notification = Notification.create({
        accountId: patientProfile.getAccountId(),
        title: 'New prescription',
        description: 'Your doctor has signed a new prescription for you.',
        actionUrl: '/patient/prescriptions',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // SignPrescriptionUseCase, which has already saved the prescription
      // by the time domain events dispatch (same tolerance as every other
      // handler in this module).
      this.logger.error(
        'Failed to notify the patient of a signed prescription',
        error instanceof Error ? error.stack : String(error),
        { prescriptionId: event.prescriptionId },
      );
    }
  }
}
