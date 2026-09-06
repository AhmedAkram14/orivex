import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetConsentScopeCategoryByCodeUseCase } from '../../../../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { ConsentRecord } from '../../../domain/entities/consent-record.entity.js';
import { ConsentState } from '../../../domain/enums/consent-state.enum.js';
import { TrustDomainError } from '../../../domain/exceptions/trust-domain.error.js';
import type { ConsentRecordRepository } from '../../../domain/repositories/consent-record.repository.js';

import type { GrantConsentCommand } from './grant-consent.command.js';

// Matches docs/10-backend-architecture.md's TrustModule "Commands accepted:
// GrantConsent, ...". Since no row already means GRANTED by default (see
// ConsentRecord's own schema comment), this use case's real job is undoing
// a prior revoke -- a patient re-inviting a doctor's access back in after
// having revoked it. Recording an explicit GRANTED row even when the
// current state already resolves to Granted (no prior row at all) is still
// correct and harmless: it becomes version 1, a real fact ("patient
// explicitly confirmed access on this date") rather than a no-op.
export class GrantConsentUseCase {
  constructor(
    private readonly consentRecordRepository: ConsentRecordRepository,
    private readonly getConsentScopeCategoryByCodeUseCase: GetConsentScopeCategoryByCodeUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: GrantConsentCommand): Promise<ConsentRecord> {
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
      state: ConsentState.Granted,
      previousVersionNumber: current?.getVersionNumber() ?? 0,
      legalBasisVersion: command.legalBasisVersion,
    });

    await this.consentRecordRepository.save(record);
    await this.eventDispatcher.dispatch(record.releaseDomainEvents());
    return record;
  }
}
