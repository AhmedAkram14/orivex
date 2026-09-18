import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import type { UnpublishArticleCommand } from './unpublish-article.command.js';

// Knowledge Center Hardening Phase 1: the author's own takedown of their
// live article. Ownership check mirrors GetArticleByIdUseCase's own
// never-leak-existence convention (404, not 403). The non-empty-reason
// requirement is validated at the DTO layer (UnpublishArticleRequestDto)
// and, redundantly but safely, by article.unpublish() itself (Phase 0) --
// this use case doesn't duplicate that check a third time.
export class UnpublishArticleUseCase {
  constructor(
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: UnpublishArticleCommand): Promise<KnowledgeArticle> {
    const article = await this.knowledgeArticleRepository.findById(command.articleId);
    if (!article) {
      throw new NotFoundError(`KnowledgeArticle "${command.articleId}" not found.`);
    }

    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!doctorProfile || doctorProfile.getId() !== article.getAuthoringDoctorId()) {
      throw new NotFoundError(`KnowledgeArticle "${command.articleId}" not found.`);
    }

    article.unpublish(command.reason, command.callerAccountId);
    await this.knowledgeArticleRepository.update(article);
    return article;
  }
}
