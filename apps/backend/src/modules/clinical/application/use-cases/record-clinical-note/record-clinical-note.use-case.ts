import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ClinicalNote } from '../../../domain/entities/clinical-note.entity.js';
import type { ClinicalNoteRepository } from '../../../domain/repositories/clinical-note.repository.js';

import type { RecordClinicalNoteCommand } from './record-clinical-note.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// clinical.module.ts only. Matches docs/12-openapi.md's
// POST /consultations/{id}/notes (createClinicalNote) exactly.
// authoringDoctorId is an explicit request field, not derived from a
// session/auth context -- Authentication isn't built yet (mirrors
// DoctorModule's accountId / ConsultationModule's patientId precedent).
export class RecordClinicalNoteUseCase {
  constructor(
    private readonly clinicalNoteRepository: ClinicalNoteRepository,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
  ) {}

  async execute(command: RecordClinicalNoteCommand): Promise<ClinicalNote> {
    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: command.consultationSessionId,
    });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    const doctor = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: command.authoringDoctorId });
    if (!doctor) {
      throw new NotFoundError(`Doctor profile "${command.authoringDoctorId}" not found.`);
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
