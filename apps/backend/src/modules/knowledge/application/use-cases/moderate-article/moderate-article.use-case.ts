import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import type { ModerateArticleCommand } from './moderate-article.command.js';

// I13 -- Knowledge Center: the SuperAdmin's decision -- approve/reject a
// PendingReview article, or archive a currently-Published one later.
// Ownership/role is entirely enforced by AdministrationController's own
// class-level @Roles(SuperAdmin) guard, same convention as
// ModerateConsultationFeedbackUseCase/ResolveDisputeUseCase.
//
// Knowledge Center Hardening Phase 2: the PendingReview article passed in
// here may be a brand-new submission or a resubmitted edit of an article
// that was already published and trusted (KnowledgeArticle.edit() sends a
// Published article back to PendingReview on author-initiated edits). This
// use case treats both the same way -- moderate() itself is unaffected --
// but `article.getPublishedAt()` (untouched by edit()) is what lets the
// presentation layer (the moderation queue) show the admin which kind of
// decision they're making.
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
