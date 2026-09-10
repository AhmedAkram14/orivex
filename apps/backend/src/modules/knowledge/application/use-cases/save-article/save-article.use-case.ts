import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { ArticleSave } from '../../../domain/entities/article-save.entity.js';
import { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';
import type { ArticleSaveRepository } from '../../../domain/repositories/article-save.repository.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import type { SaveArticleCommand } from './save-article.command.js';

// I13 -- Knowledge Center: idempotent (returns the existing bookmark if
// one exists) -- same "reuse if it already exists" idiom as
// FollowDoctorUseCase. Only a Published article can be saved -- a patient
// can't bookmark something they were never shown.
export class SaveArticleUseCase {
  constructor(
    private readonly articleSaveRepository: ArticleSaveRepository,
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  async execute(command: SaveArticleCommand): Promise<ArticleSave> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('No patient profile exists for this account.');
    }

    const article = await this.knowledgeArticleRepository.findById(command.articleId);
    if (!article || article.getStatus() !== KnowledgeArticleStatus.Published) {
      throw new NotFoundError(`KnowledgeArticle "${command.articleId}" not found.`);
    }

    const existing = await this.articleSaveRepository.findByArticleAndPatient(command.articleId, patientProfile.getId());
    if (existing) {
      return existing;
    }

    const save = ArticleSave.save({ articleId: command.articleId, patientId: patientProfile.getId() });
    await this.articleSaveRepository.save(save);
    return save;
  }
}
