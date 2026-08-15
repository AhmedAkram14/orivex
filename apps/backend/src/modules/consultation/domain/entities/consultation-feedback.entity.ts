import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { ConsultationFeedbackSubmittedEvent } from '../events/consultation-feedback-submitted.event.js';
import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

const MIN_RATING = 1;
const MAX_RATING = 5;

export interface SubmitConsultationFeedbackProps {
  consultationSessionId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  comment?: string;
}

export interface ReconstituteConsultationFeedbackProps {
  id: string;
  consultationSessionId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

// Consultation lifecycle completion follow-up (2026-07-26): the sole source
// of a doctor's rating (DoctorProfile carries no editable rating column --
// aggregated from these rows at read time). One per ConsultationSession,
// enforced both here at creation (SubmitConsultationFeedbackUseCase checks
// for an existing row first) and at the database level (unique index on
// consultationSessionId) -- belt and suspenders, matching this codebase's
// own established double-enforcement idiom (e.g. Stage O.9's migration
// safety check).
//
// Product follow-up (2026-07-29): the patient can now edit or delete their
// own review (UpdateConsultationFeedbackUseCase/DeleteConsultationFeedback
// UseCase) -- supersedes this entity's own earlier "immutable, no edit/
// delete" comment, per explicit product direction. `rating`/`comment` are no
// longer `readonly`; `id`/`consultationSessionId`/`patientId`/`doctorId`/
// `createdAt` still are -- editing a review never reassigns which session,
// patient, or doctor it belongs to.
export class ConsultationFeedback {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly consultationSessionId: string,
    private readonly patientId: string,
    private readonly doctorId: string,
    private rating: number,
    private comment: string | undefined,
    private readonly createdAt: Date,
  ) {}

  static submit(props: SubmitConsultationFeedbackProps): ConsultationFeedback {
    if (!Number.isInteger(props.rating) || props.rating < MIN_RATING || props.rating > MAX_RATING) {
      throw new ConsultationDomainError(`Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}.`);
    }

    const feedback = new ConsultationFeedback(
      randomUUID(),
      props.consultationSessionId,
      props.patientId,
      props.doctorId,
      props.rating,
      props.comment?.trim() || undefined,
      new Date(),
    );

    feedback.record(
      new ConsultationFeedbackSubmittedEvent(feedback.id, feedback.doctorId, feedback.consultationSessionId),
    );
    return feedback;
  }

  // Same validation as submit() -- a rating out of range is never valid,
  // whether this is the first submission or a correction.
  update(rating: number, comment?: string): void {
    if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
      throw new ConsultationDomainError(`Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}.`);
    }
    this.rating = rating;
    this.comment = comment?.trim() || undefined;
  }

  static reconstitute(props: ReconstituteConsultationFeedbackProps): ConsultationFeedback {
    return new ConsultationFeedback(
      props.id,
      props.consultationSessionId,
      props.patientId,
      props.doctorId,
      props.rating,
      props.comment,
      props.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getConsultationSessionId(): string {
    return this.consultationSessionId;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getRating(): number {
    return this.rating;
  }

  getComment(): string | undefined {
    return this.comment;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
