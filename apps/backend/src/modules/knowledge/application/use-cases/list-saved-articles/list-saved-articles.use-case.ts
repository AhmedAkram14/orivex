import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { ArticleSave } from '../../../domain/entities/article-save.entity.js';
import type { ArticleSaveRepository } from '../../../domain/repositories/article-save.repository.js';

export interface ListSavedArticlesQuery {
  callerAccountId: string;
}

export class ListSavedArticlesUseCase {
  constructor(
    private readonly articleSaveRepository: ArticleSaveRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  async execute(query: ListSavedArticlesQuery): Promise<ArticleSave[]> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('No patient profile exists for this account.');
    }
    return this.articleSaveRepository.listByPatientId(patientProfile.getId());
  }
}
