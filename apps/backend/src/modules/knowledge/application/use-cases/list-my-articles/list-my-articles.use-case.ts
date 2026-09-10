import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

export interface ListMyArticlesQuery {
  callerAccountId: string;
}

// I13 -- Knowledge Center: a doctor's own "My Articles" -- every status,
// so they can see a still-PendingReview submission or the reason a past
// one was Rejected/Archived.
export class ListMyArticlesUseCase {
  constructor(
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(query: ListMyArticlesQuery): Promise<KnowledgeArticle[]> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (!doctorProfile) {
      throw new NotFoundError('No doctor profile exists for this account.');
    }
    return this.knowledgeArticleRepository.listByAuthor(doctorProfile.getId());
  }
}
