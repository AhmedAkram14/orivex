import type { ConsultationFeedback } from '../entities/consultation-feedback.entity.js';

export interface DoctorRatingAggregate {
  averageRating: number | null;
  reviewCount: number;
  /** Of `reviewCount`, how many carry a written comment -- distinct from the star-only ratings that make up the rest. */
  writtenReviewCount: number;
}

export interface ConsultationFeedbackRepository {
  findByConsultationSessionId(consultationSessionId: string): Promise<ConsultationFeedback | null>;
  /** Newest first. Backs both the doctor's own review list and the doctor-directory/profile public reviews. */
  listForDoctor(doctorId: string, page: number, limit: number): Promise<{ feedback: ConsultationFeedback[]; total: number }>;
  getRatingAggregateForDoctor(doctorId: string): Promise<DoctorRatingAggregate>;
  /** Batched form for a paginated doctor-directory listing -- avoids one aggregate query per doctor per page (N+1). */
  getRatingAggregatesForDoctors(doctorIds: string[]): Promise<Map<string, DoctorRatingAggregate>>;
  save(feedback: ConsultationFeedback): Promise<void>;
  /** Persists an edit to an already-saved feedback row -- distinct from `save()`, which only ever inserts a new one. */
  update(feedback: ConsultationFeedback): Promise<void>;
  delete(id: string): Promise<void>;
}
