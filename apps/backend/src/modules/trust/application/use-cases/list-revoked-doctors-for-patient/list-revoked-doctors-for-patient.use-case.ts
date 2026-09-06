import { GetConsentScopeCategoryByCodeUseCase } from '../../../../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { TrustDomainError } from '../../../domain/exceptions/trust-domain.error.js';
import type { ConsentRecordRepository } from '../../../domain/repositories/consent-record.repository.js';

export interface ListRevokedDoctorsForPatientQuery {
  patientId: string;
  scopeCode: string;
}

// Powers the patient-facing "Data sharing" list: every doctorId this
// patient has currently revoked access for, in one query, rather than the
// caller having to call GetConsentStateUseCase once per doctor in their
// appointment history.
export class ListRevokedDoctorsForPatientUseCase {
  constructor(
    private readonly consentRecordRepository: ConsentRecordRepository,
    private readonly getConsentScopeCategoryByCodeUseCase: GetConsentScopeCategoryByCodeUseCase,
  ) {}

  async execute(query: ListRevokedDoctorsForPatientQuery): Promise<Set<string>> {
    const scopeCategory = await this.getConsentScopeCategoryByCodeUseCase.execute({ code: query.scopeCode });
    if (!scopeCategory) {
      throw new TrustDomainError(`Consent scope category "${query.scopeCode}" is not configured.`);
    }

    const revoked = await this.consentRecordRepository.findAllRevokedForPatient(query.patientId, scopeCategory.getId());
    return new Set(revoked.map((record) => record.getDoctorId()));
  }
}
