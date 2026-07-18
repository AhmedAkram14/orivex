import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ClinicalNote } from '../../../domain/entities/clinical-note.entity.js';
import type { ClinicalNoteRepository } from '../../../domain/repositories/clinical-note.repository.js';

import type { RecordClinicalNoteCommand } from './record-clinical-note.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// clinical.module.ts only. Matches docs/12-openapi.md's
// POST /consultations/{id}/notes (createClinicalNote, "treating doctor
// only", documented 403) exactly. The controller resolves authoringDoctorId
// from the caller's JWT before this use case ever runs; the check below is
// this layer's own defense-in-depth, independent of the presentation layer.
export class RecordClinicalNoteUseCase {
  constructor(
    private readonly clinicalNoteRepository: ClinicalNoteRepository,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
  ) {}

  async execute(command: RecordClinicalNoteCommand): Promise<ClinicalNote> {
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
      throw new ForbiddenError('Only the treating doctor for this consultation may author a clinical note.');
    }

    const note = ClinicalNote.author({
      consultationSessionId: command.consultationSessionId,
      authoringDoctorId: command.authoringDoctorId,
      content: command.content,
      addendumOfNoteId: command.addendumOfNoteId,
    });

    await this.clinicalNoteRepository.save(note);
    return note;
  }
}
