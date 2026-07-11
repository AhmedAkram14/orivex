import type { ClinicalNote as PrismaClinicalNoteRow } from '@prisma/client';

import { ClinicalNote } from '../../domain/entities/clinical-note.entity.js';

export function toDomainClinicalNote(row: PrismaClinicalNoteRow): ClinicalNote {
  return ClinicalNote.reconstitute({
    id: row.id,
    consultationSessionId: row.consultationSessionId,
    authoringDoctorId: row.authoringDoctorId,
    content: row.content,
    addendumOfNoteId: row.addendumOfNoteId ?? undefined,
    createdAt: row.createdAt,
  });
}
