import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { ConsultationFeedbackSubmittedEvent } from '../events/consultation-feedback-submitted.event.js';
import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

const MIN_RATING = 1;
const MAX_RATING = 5;

function validateRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    throw new ConsultationDomainError(`Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}.`);
  }
}

// Dimension ratings are optional (undefined = not provided), but when
// present they follow the exact same 1-5 integer rule as the overall
// rating -- there is no separate scale for "was the doctor punctual".
function validateOptionalDimension(value: number | undefined): void {
  if (value === undefined) {
    return;
  }
  if (!Number.isInteger(value) || value < MIN_RATING || value > MAX_RATING) {
    throw new ConsultationDomainError(`Dimension rating must be an integer between ${MIN_RATING} and ${MAX_RATING}.`);
  }
}

export interface SubmitConsultationFeedbackProps {
  consultationSessionId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  comment?: string;
  communicationRating?: number;
  punctualityRating?: number;
  thoroughnessRating?: number;
}

export interface ReconstituteConsultationFeedbackProps {
  id: string;
  consultationSessionId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  comment?: string;
  communicationRating?: number;
  punctualityRating?: number;
  thoroughnessRating?: number;
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
    private communicationRating: number | undefined,
    private punctualityRating: number | undefined,
    private thoroughnessRating: number | undefined,
    private readonly createdAt: Date,
  ) {}

  static submit(props: SubmitConsultationFeedbackProps): ConsultationFeedback {
    validateRating(props.rating);
    validateOptionalDimension(props.communicationRating);
    validateOptionalDimension(props.punctualityRating);
    validateOptionalDimension(props.thoroughnessRating);

    const feedback = new ConsultationFeedback(
      randomUUID(),
      props.consultationSessionId,
      props.patientId,
      props.doctorId,
      props.rating,
      props.comment?.trim() || undefined,
      props.communicationRating,
      props.punctualityRating,
      props.thoroughnessRating,
      new Date(),
    );

    feedback.record(
      new ConsultationFeedbackSubmittedEvent(feedback.id, feedback.doctorId, feedback.consultationSessionId),
    );
    return feedback;
  }

  // Same validation as submit() -- a rating out of range is never valid,
  // whether this is the first submission or a correction.
  update(
    rating: number,
    comment?: string,
    communicationRating?: number,
    punctualityRating?: number,
    thoroughnessRating?: number,
  ): void {
    validateRating(rating);
    validateOptionalDimension(communicationRating);
    validateOptionalDimension(punctualityRating);
    validateOptionalDimension(thoroughnessRating);
    this.rating = rating;
    this.comment = comment?.trim() || undefined;
    this.communicationRating = communicationRating;
    this.punctualityRating = punctualityRating;
    this.thoroughnessRating = thoroughnessRating;
  }

  static reconstitute(props: ReconstituteConsultationFeedbackProps): ConsultationFeedback {
    return new ConsultationFeedback(
      props.id,
      props.consultationSessionId,
      props.patientId,
      props.doctorId,
      props.rating,
      props.comment,
      props.communicationRating,
      props.punctualityRating,
      props.thoroughnessRating,
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

  // Multi-dimensional reviews (docs/01-prd.md L99-100 §2.11): captured
  // separately from the overall `rating` -- "was the diagnosis right" and
  // "was the doctor kind" are different signals.
  getCommunicationRating(): number | undefined {
    return this.communicationRating;
  }

  getPunctualityRating(): number | undefined {
    return this.punctualityRating;
  }

  getThoroughnessRating(): number | undefined {
    return this.thoroughnessRating;
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
