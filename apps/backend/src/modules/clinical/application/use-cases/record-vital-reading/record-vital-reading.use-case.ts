import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { VitalReading } from '../../../domain/entities/vital-reading.entity.js';
import type { VitalReadingRepository } from '../../../domain/repositories/vital-reading.repository.js';

import type { RecordVitalReadingCommand } from './record-vital-reading.command.js';

// Real Clinical Vitals Demo pass: the write path VitalReading never had --
// its own entity comment previously read "there is no create/record-vital
// producer wired up anywhere yet." Mirrors
// RecordConsultationDiagnosisUseCase's exact doctor-authorship pattern:
// resolve the session's own appointment, resolve the calling doctor by
// account, and only let the treating doctor for THIS SPECIFIC consultation
// record a reading for it -- never a generic system user, never any doctor.
export class RecordVitalReadingUseCase {
  constructor(
    private readonly vitalReadingRepository: VitalReadingRepository,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: RecordVitalReadingCommand): Promise<VitalReading> {
    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: command.consultationSessionId,
    });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    const doctor = await this.getDoctorProfileByAccountIdUseCase.execute({
      accountId: command.authoringDoctorAccountId,
    });
    if (!doctor || appointment.getDoctorId() !== doctor.getId()) {
      throw new ForbiddenError('Only the treating doctor for this consultation may record a vital reading.');
    }

    const vitalReading = VitalReading.create({
      patientId: appointment.getPatientId(),
      type: command.type,
      value: command.value,
      diastolicValue: command.diastolicValue,
      recordedAt: command.recordedAt,
      recordedByDoctorId: doctor.getId(),
      consultationSessionId: command.consultationSessionId,
    });
    await this.vitalReadingRepository.save(vitalReading);
    return vitalReading;
  }
}
