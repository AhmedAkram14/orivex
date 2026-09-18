import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';
import { PreReviewThresholdService } from '../../services/pre-review-threshold.service.js';

import type { SubmitArticleForReviewCommand } from './submit-article-for-review.command.js';

// Knowledge Center Hardening Phase 1: a Draft's one-way exit into the
// review pipeline. Ownership check mirrors GetArticleByIdUseCase's own
// never-leak-existence convention -- a non-existent article and one that
// exists but belongs to someone else both surface as a plain 404, never a
// distinguishing 403.
export class SubmitArticleForReviewUseCase {
  constructor(
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly preReviewThresholdService: PreReviewThresholdService,
  ) {}

  async execute(command: SubmitArticleForReviewCommand): Promise<KnowledgeArticle> {
    const article = await this.knowledgeArticleRepository.findById(command.articleId);
    if (!article) {
      throw new NotFoundError(`KnowledgeArticle "${command.articleId}" not found.`);
    }

    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!doctorProfile || doctorProfile.getId() !== article.getAuthoringDoctorId()) {
      throw new NotFoundError(`KnowledgeArticle "${command.articleId}" not found.`);
    }

    const requiresPreReview = await this.preReviewThresholdService.computeRequiresPreReview(doctorProfile.getId());
    article.submitForReview(requiresPreReview);
    await this.knowledgeArticleRepository.update(article);
    return article;
  }
}
