import { GetConsentScopeCategoryByCodeUseCase } from '../../../../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { ConsentState } from '../../../domain/enums/consent-state.enum.js';
import type { ConsentRecordRepository } from '../../../domain/repositories/consent-record.repository.js';
import { TrustDomainError } from '../../../domain/exceptions/trust-domain.error.js';

export interface GetConsentStateQuery {
  patientId: string;
  doctorId: string;
  scopeCode: string;
}

// Matches docs/10-backend-architecture.md's TrustModule public interface
// exactly: "getConsentState(patientId, doctorId, scope)". No row for this
// (patientId, doctorId, scopeCode) triple means GRANTED by default --
// ConsentRecord's own schema comment carries the full rationale (an
// existing appointment relationship already implies a treating
// relationship; a patient's affirmative action is what revokes it).
//
// Per docs/10-backend-architecture.md Section 9's hard rule ("ClinicalModule's
// read path always re-checks TrustModule synchronously regardless of cached
// event state"): this is a plain synchronous query, never backed by a
// cache a stale ConsentRevoked event could leave inconsistent.
export class GetConsentStateUseCase {
  constructor(
    private readonly consentRecordRepository: ConsentRecordRepository,
    private readonly getConsentScopeCategoryByCodeUseCase: GetConsentScopeCategoryByCodeUseCase,
  ) {}

  async execute(query: GetConsentStateQuery): Promise<ConsentState> {
    const scopeCategory = await this.getConsentScopeCategoryByCodeUseCase.execute({ code: query.scopeCode });
    if (!scopeCategory) {
      throw new TrustDomainError(`Consent scope category "${query.scopeCode}" is not configured.`);
    }

    const current = await this.consentRecordRepository.findCurrent(query.patientId, query.doctorId, scopeCategory.getId());
    return current?.getState() ?? ConsentState.Granted;
  }
}
