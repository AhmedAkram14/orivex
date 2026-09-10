import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';
import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

export interface GetArticleByIdQuery {
  articleId: string;
  callerAccountId: string;
}

// I13 -- Knowledge Center: a Published article is visible to anyone (the
// authenticated patient/doctor feed); a PendingReview/Rejected/Archived
// one is visible only to its own authoring doctor -- checking their own
// submission's status -- never a distinguishing 403 for anyone else, same
// "never leak existence" convention as every other single-resource read
// in this codebase.
export class GetArticleByIdUseCase {
  constructor(
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(query: GetArticleByIdQuery): Promise<KnowledgeArticle> {
    const article = await this.knowledgeArticleRepository.findById(query.articleId);
    if (!article) {
      throw new NotFoundError(`KnowledgeArticle "${query.articleId}" not found.`);
    }
    if (article.getStatus() === KnowledgeArticleStatus.Published) {
      return article;
    }

    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (!doctorProfile || doctorProfile.getId() !== article.getAuthoringDoctorId()) {
      throw new NotFoundError(`KnowledgeArticle "${query.articleId}" not found.`);
    }
    return article;
  }
}
