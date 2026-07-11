import type { ClinicalNote } from '../entities/clinical-note.entity.js';

export interface ClinicalNoteRepository {
  findById(id: string): Promise<ClinicalNote | null>;
  save(note: ClinicalNote): Promise<void>;
}
