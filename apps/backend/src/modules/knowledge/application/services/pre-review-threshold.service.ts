import type { KnowledgeArticleRepository } from '../../domain/repositories/knowledge-article.repository.js';

// Knowledge Center Hardening Phase 1: extracted out of AuthorArticleUseCase
// (which used to compute this inline) so SubmitArticleForReviewUseCase can
// share the exact same rule instead of redefining PRE_REVIEW_THRESHOLD a
// second time. Mirrors AppointmentPartyResolver's own shape from the
// Disputes work (application/services/*.service.ts, constructor-injected
// with only the repository it needs, one focused async method) -- this
// repo's convention for a small piece of domain-adjacent policy shared by
// more than one use case.
export class PreReviewThresholdService {
  // I13 -- Knowledge Center (docs/01.1-prd-update.md §6): a doctor's first 3
  // articles ever Published/Archived require pre-publication admin review;
  // from the 4th onward, an article publishes immediately but stays subject
  // to post-publication spot-review.
  private static readonly PRE_REVIEW_THRESHOLD = 3;

  constructor(private readonly knowledgeArticleRepository: KnowledgeArticleRepository) {}

  async computeRequiresPreReview(authoringDoctorId: string): Promise<boolean> {
    const priorPublishedCount = await this.knowledgeArticleRepository.countEverPublishedByAuthor(authoringDoctorId);
    return priorPublishedCount < PreReviewThresholdService.PRE_REVIEW_THRESHOLD;
  }
}
