import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { LabRequest } from '../../../domain/entities/lab-request.entity.js';
import type { LabRequestRepository } from '../../../domain/repositories/lab-request.repository.js';

import type { RecordLabRequestCommand } from './record-lab-request.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// clinical.module.ts only. Mirrors RecordClinicalNoteUseCase/
// SignPrescriptionUseCase exactly: only the treating doctor for this
// consultation may author a lab request. The controller resolves
// authoringDoctorId from the caller's JWT before this use case ever runs;
// the check below is this layer's own defense-in-depth.
export class RecordLabRequestUseCase {
  constructor(
    private readonly labRequestRepository: LabRequestRepository,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
  ) {}

  async execute(command: RecordLabRequestCommand): Promise<LabRequest> {
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

    const doctor = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: command.authoringDoctorId });
    if (!doctor) {
      throw new NotFoundError(`Doctor profile "${command.authoringDoctorId}" not found.`);
    }

    if (appointment.getDoctorId() !== command.authoringDoctorId) {
      throw new ForbiddenError('Only the treating doctor for this consultation may author a lab request.');
    }

    const labRequest = LabRequest.order({
      consultationSessionId: command.consultationSessionId,
      authoringDoctorId: command.authoringDoctorId,
      testName: command.testName,
      clinicalReason: command.clinicalReason,
      instructions: command.instructions,
    });

    await this.labRequestRepository.save(labRequest);
    return labRequest;
  }
}
