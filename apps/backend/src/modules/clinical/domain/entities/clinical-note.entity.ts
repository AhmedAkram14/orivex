import { randomUUID } from 'node:crypto';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

export interface AuthorClinicalNoteProps {
  consultationSessionId: string;
  authoringDoctorId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  addendumOfNoteId?: string;
}

export interface ReconstituteClinicalNoteProps {
  id: string;
  consultationSessionId: string;
  authoringDoctorId: string;
  content: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
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
//
// I5 -- SOAP-structured clinical notes (inventory: "SOAP structure 🟢"
// core). Every note authored from here on requires all four SOAP fields;
// `content` is derived (a plain-text concatenation) so every existing
// consumer that only ever reads `getContent()` (audit metadata, any future
// full-text search) keeps working unchanged. `subjective`/`objective`/
// `assessment`/`plan` are undefined only for notes reconstituted from a row
// created before this column existed -- an honest historical gap, never
// backfilled with fabricated sections.
export class ClinicalNote {
  private constructor(
    private readonly id: string,
    private readonly consultationSessionId: string,
    private readonly authoringDoctorId: string,
    private readonly content: string,
    private readonly subjective: string | undefined,
    private readonly objective: string | undefined,
    private readonly assessment: string | undefined,
    private readonly plan: string | undefined,
    private readonly addendumOfNoteId: string | undefined,
    private readonly createdAt: Date,
  ) {}

  static author(props: AuthorClinicalNoteProps): ClinicalNote {
    const subjective = props.subjective?.trim() ?? '';
    const objective = props.objective?.trim() ?? '';
    const assessment = props.assessment?.trim() ?? '';
    const plan = props.plan?.trim() ?? '';
    if (!subjective || !objective || !assessment || !plan) {
      throw new ClinicalDomainError('subjective, objective, assessment, and plan must all be non-empty.');
    }
    const content = `S: ${subjective}\n\nO: ${objective}\n\nA: ${assessment}\n\nP: ${plan}`;
    return new ClinicalNote(
      randomUUID(),
      props.consultationSessionId,
      props.authoringDoctorId,
      content,
      subjective,
      objective,
      assessment,
      plan,
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
      props.subjective,
      props.objective,
      props.assessment,
      props.plan,
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

  getSubjective(): string | undefined {
    return this.subjective;
  }

  getObjective(): string | undefined {
    return this.objective;
  }

  getAssessment(): string | undefined {
    return this.assessment;
  }

  getPlan(): string | undefined {
    return this.plan;
  }

  getAddendumOfNoteId(): string | undefined {
    return this.addendumOfNoteId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
