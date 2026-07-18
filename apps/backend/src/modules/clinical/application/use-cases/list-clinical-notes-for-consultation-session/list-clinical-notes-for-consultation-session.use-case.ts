import type { ClinicalNote } from '../../../domain/entities/clinical-note.entity.js';
import type { ClinicalNoteRepository } from '../../../domain/repositories/clinical-note.repository.js';

import type { ListClinicalNotesForConsultationSessionQuery } from './list-clinical-notes-for-consultation-session.query.js';

// Pure read — mirrors the established List*UseCase pattern. Exists so the
// presentation layer (PatientDashboardController) never reaches into
// ClinicalNoteRepository directly.
export class ListClinicalNotesForConsultationSessionUseCase {
  constructor(private readonly clinicalNoteRepository: ClinicalNoteRepository) {}

  async execute(query: ListClinicalNotesForConsultationSessionQuery): Promise<ClinicalNote[]> {
    return this.clinicalNoteRepository.findByConsultationSessionId(query.consultationSessionId);
  }
}
