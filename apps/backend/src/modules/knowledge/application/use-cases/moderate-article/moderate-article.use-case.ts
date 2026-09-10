import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import type { ModerateArticleCommand } from './moderate-article.command.js';

// I13 -- Knowledge Center: the SuperAdmin's decision -- approve/reject a
// PendingReview article, or archive a currently-Published one later.
// Ownership/role is entirely enforced by AdministrationController's own
// class-level @Roles(SuperAdmin) guard, same convention as
// ModerateConsultationFeedbackUseCase/ResolveDisputeUseCase.
export class ModerateArticleUseCase {
  constructor(private readonly knowledgeArticleRepository: KnowledgeArticleRepository) {}

  async execute(command: ModerateArticleCommand): Promise<KnowledgeArticle> {
    const article = await this.knowledgeArticleRepository.findById(command.articleId);
    if (!article) {
      throw new NotFoundError(`KnowledgeArticle "${command.articleId}" not found.`);
    }

    article.moderate(command.status, command.reason, command.moderatorAccountId);
    await this.knowledgeArticleRepository.update(article);
    return article;
  }
}
