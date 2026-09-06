import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetConsentScopeCategoryByCodeUseCase } from '../../../../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { ConsentRecord } from '../../../domain/entities/consent-record.entity.js';
import { ConsentState } from '../../../domain/enums/consent-state.enum.js';
import { TrustDomainError } from '../../../domain/exceptions/trust-domain.error.js';
import type { ConsentRecordRepository } from '../../../domain/repositories/consent-record.repository.js';

import type { RevokeConsentCommand } from './revoke-consent.command.js';

// Matches docs/10-backend-architecture.md's TrustModule "Commands accepted:
// ..., RevokeConsent". Patient-initiated only (enforced at the controller
// layer, which resolves patientId from the caller's own JWT -- never a
// patientId taken from the request body).
export class RevokeConsentUseCase {
  constructor(
    private readonly consentRecordRepository: ConsentRecordRepository,
    private readonly getConsentScopeCategoryByCodeUseCase: GetConsentScopeCategoryByCodeUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: RevokeConsentCommand): Promise<ConsentRecord> {
    const scopeCategory = await this.getConsentScopeCategoryByCodeUseCase.execute({ code: command.scopeCode });
    if (!scopeCategory) {
      throw new TrustDomainError(`Consent scope category "${command.scopeCode}" is not configured.`);
    }

    const current = await this.consentRecordRepository.findCurrent(
      command.patientId,
      command.doctorId,
      scopeCategory.getId(),
    );

    const record = ConsentRecord.recordChange({
      patientId: command.patientId,
      doctorId: command.doctorId,
      scopeCategoryId: scopeCategory.getId(),
      scopeCategoryCode: scopeCategory.getCode(),
      state: ConsentState.Revoked,
      previousVersionNumber: current?.getVersionNumber() ?? 0,
      legalBasisVersion: command.legalBasisVersion,
    });

    await this.consentRecordRepository.save(record);
    await this.eventDispatcher.dispatch(record.releaseDomainEvents());
    return record;
  }
}
