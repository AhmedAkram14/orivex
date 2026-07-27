import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { HealthGraphNodeType } from '../../../domain/enums/health-graph-node-type.enum.js';
import { RecordDiagnosisCommand } from '../record-diagnosis/record-diagnosis.command.js';
import type { RecordDiagnosisResult } from '../record-diagnosis/record-diagnosis.use-case.js';
import type { RecordDiagnosisUseCase } from '../record-diagnosis/record-diagnosis.use-case.js';

import type { RecordConsultationDiagnosisCommand } from './record-consultation-diagnosis.command.js';

// Consultation lifecycle completion follow-up (2026-07-26): the thin
// controller-facing wrapper that finally exposes RecordDiagnosisUseCase --
// which has existed since Sprint 10 with no HTTP endpoint at all (its own
// header comment: "not wired to any controller this sprint"). Reuses that
// use case completely unchanged; this only resolves patientId/doctorId/
// ownership from the consultation session (mirroring
// RecordClinicalNoteUseCase's exact pattern) and fixes nodeType to
// Condition, since this endpoint's whole contract is specifically "record a
// diagnosis," not "record any HealthGraphNode type."
export class RecordConsultationDiagnosisUseCase {
  constructor(
    private readonly recordDiagnosisUseCase: RecordDiagnosisUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: RecordConsultationDiagnosisCommand): Promise<RecordDiagnosisResult> {
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
      throw new ForbiddenError('Only the treating doctor for this consultation may record a diagnosis.');
    }

    return this.recordDiagnosisUseCase.execute(
      new RecordDiagnosisCommand({
        patientId: appointment.getPatientId(),
        doctorId: doctor.getId(),
        consultationSessionId: command.consultationSessionId,
        nodeType: HealthGraphNodeType.Condition,
        freeTextDescription: command.freeTextDescription,
        certaintyLevel: command.certaintyLevel,
        startJourney: command.startJourney,
      }),
    );
  }
}
