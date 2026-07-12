import type { ClinicalNote } from '../../domain/entities/clinical-note.entity.js';

// Matches docs/12-openapi.md's ClinicalNote schema -- aiMetadata is
// deliberately omitted -- no use case or entity in this module tracks a
// link between a clinical note and an AI suggestion yet (see
// RecordClinicalNoteRequestDto's derivedFromSuggestionId comment).
export class ClinicalNoteResponseDto {
  id!: string;
  consultationSessionId!: string;
  content!: string;
  addendumOfNoteId!: string | null;
  createdAt!: string;

  static fromDomain(note: ClinicalNote): ClinicalNoteResponseDto {
    const dto = new ClinicalNoteResponseDto();
    dto.id = note.getId();
    dto.consultationSessionId = note.getConsultationSessionId();
    dto.content = note.getContent();
    dto.addendumOfNoteId = note.getAddendumOfNoteId() ?? null;
    dto.createdAt = note.getCreatedAt().toISOString();
    return dto;
  }
}
