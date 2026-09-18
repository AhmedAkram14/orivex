import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import type { EditArticleCommand } from './edit-article.command.js';

// Knowledge Center Hardening Phase 1: covers both "edit a still-draft/
// pending article" and "edit a published article" (which re-enters review)
// in one use case -- the entity's edit() already encapsulates which case
// applies, so no branching is needed here. specialtyId is never taken from
// the client (even though the current frontend never sends one): it's
// re-derived from the doctor's CURRENT profile on every edit, same as
// AuthorArticleUseCase does at creation time, so a specialty change on the
// profile is reflected the next time the doctor touches any of their
// articles. Ownership check mirrors GetArticleByIdUseCase's own
// never-leak-existence convention (404, not 403).
export class EditArticleUseCase {
  constructor(
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: EditArticleCommand): Promise<KnowledgeArticle> {
    const article = await this.knowledgeArticleRepository.findById(command.articleId);
    if (!article) {
      throw new NotFoundError(`KnowledgeArticle "${command.articleId}" not found.`);
    }

    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!doctorProfile || doctorProfile.getId() !== article.getAuthoringDoctorId()) {
      throw new NotFoundError(`KnowledgeArticle "${command.articleId}" not found.`);
    }

    article.edit(command.title, command.body, command.language, doctorProfile.getSpecialtyId(), command.sourcesText);
    await this.knowledgeArticleRepository.update(article);
    return article;
  }
}
