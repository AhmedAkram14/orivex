import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { ArticleSaveRepository } from '../../../domain/repositories/article-save.repository.js';

import type { UnsaveArticleCommand } from './unsave-article.command.js';

export class UnsaveArticleUseCase {
  constructor(
    private readonly articleSaveRepository: ArticleSaveRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  async execute(command: UnsaveArticleCommand): Promise<void> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('No patient profile exists for this account.');
    }

    const existing = await this.articleSaveRepository.findByArticleAndPatient(command.articleId, patientProfile.getId());
    if (!existing) {
      return;
    }
    await this.articleSaveRepository.delete(existing.getId());
  }
}
