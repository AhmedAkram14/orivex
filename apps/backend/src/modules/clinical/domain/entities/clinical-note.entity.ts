import { randomUUID } from 'node:crypto';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

export interface AuthorClinicalNoteProps {
  consultationSessionId: string;
  authoringDoctorId: string;
  content: string;
  addendumOfNoteId?: string;
}

export interface ReconstituteClinicalNoteProps {
  id: string;
  consultationSessionId: string;
  authoringDoctorId: string;
  content: string;
  addendumOfNoteId?: string;
  createdAt: Date;
}

// Aggregate root, own PK separate from HealthGraphNode
// (docs/09-physical-database.md's clinical_notes table). Fully immutable
// -- no update methods; a correction is authored as a new note referencing
// the original via addendumOfNoteId (docs/07-domain-data-model.md's
// "never rewrite" rule; docs/12-openapi.md's createClinicalNote).
// derivedFromSuggestionId is deliberately not modeled -- AIModule doesn't
// exist yet.
export class ClinicalNote {
  private constructor(
    private readonly id: string,
    private readonly consultationSessionId: string,
    private readonly authoringDoctorId: string,
    private readonly content: string,
    private readonly addendumOfNoteId: string | undefined,
    private readonly createdAt: Date,
  ) {}

  static author(props: AuthorClinicalNoteProps): ClinicalNote {
    if (!props.content || props.content.trim().length === 0) {
      throw new ClinicalDomainError('content must not be empty.');
    }
    return new ClinicalNote(
      randomUUID(),
      props.consultationSessionId,
      props.authoringDoctorId,
      props.content.trim(),
      props.addendumOfNoteId,
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteClinicalNoteProps): ClinicalNote {
    return new ClinicalNote(
      props.id,
      props.consultationSessionId,
      props.authoringDoctorId,
      props.content,
      props.addendumOfNoteId,
      props.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getConsultationSessionId(): string {
    return this.consultationSessionId;
  }

  getAuthoringDoctorId(): string {
    return this.authoringDoctorId;
  }

  getContent(): string {
    return this.content;
  }

  getAddendumOfNoteId(): string | undefined {
    return this.addendumOfNoteId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
