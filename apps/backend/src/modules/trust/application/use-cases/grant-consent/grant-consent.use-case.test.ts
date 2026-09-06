import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DomainEvent } from '../../../../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { ConsentScopeCategory } from '../../../../reference/domain/entities/consent-scope-category.entity.js';
import type { ConsentScopeCategoryRepository } from '../../../../reference/domain/repositories/consent-scope-category.repository.js';
import { GetConsentScopeCategoryByCodeUseCase } from '../../../../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { ConsentRecord } from '../../../domain/entities/consent-record.entity.js';
import { ConsentState } from '../../../domain/enums/consent-state.enum.js';
import type { ConsentRecordRepository } from '../../../domain/repositories/consent-record.repository.js';

import { GrantConsentCommand } from './grant-consent.command.js';
import { GrantConsentUseCase } from './grant-consent.use-case.js';

const GENERAL_SCOPE = ConsentScopeCategory.reconstitute({
  id: '11111111-1111-4111-8111-111111111111',
  code: 'general',
  name: 'General Health Data',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

class FakeConsentScopeCategoryRepository implements ConsentScopeCategoryRepository {
  async findAll() {
    return [GENERAL_SCOPE];
  }
  async findByCode(code: string) {
    return code === GENERAL_SCOPE.getCode() ? GENERAL_SCOPE : null;
  }
}

class FakeConsentRecordRepository implements ConsentRecordRepository {
  public readonly saved: ConsentRecord[] = [];
  async findCurrent(patientId: string, doctorId: string, scopeCategoryId: string): Promise<ConsentRecord | null> {
    const matches = this.saved.filter(
      (r) => r.getPatientId() === patientId && r.getDoctorId() === doctorId && r.getScopeCategoryId() === scopeCategoryId,
    );
    if (matches.length === 0) return null;
    return matches.reduce((latest, r) => (r.getVersionNumber() > latest.getVersionNumber() ? r : latest));
  }
  async findAllRevokedForPatient(): Promise<ConsentRecord[]> {
    return [];
  }
  async findAllForPatient(): Promise<ConsentRecord[]> {
    return this.saved;
  }
  async save(record: ConsentRecord): Promise<void> {
    this.saved.push(record);
  }
}

class FakeDomainEventDispatcher implements DomainEventDispatcher {
  public readonly dispatched: DomainEvent[] = [];
  async dispatch(events: DomainEvent[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

describe('GrantConsentUseCase', () => {
  it('undoes a prior revoke by recording a new GRANTED row at the next version, and dispatches ConsentGranted', async () => {
    const consentRepo = new FakeConsentRecordRepository();
    const dispatcher = new FakeDomainEventDispatcher();
    const scopeUseCase = new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository());
    const patientId = '22222222-2222-4222-8222-222222222222';
    const doctorId = '33333333-3333-4333-8333-333333333333';

    // Seed a prior revoke directly via the repository (bypassing the
    // use case, matching how the sibling revoke test proves the same
    // invariant from its own side).
    consentRepo.saved.push(
      ConsentRecord.recordChange({
        patientId,
        doctorId,
        scopeCategoryId: GENERAL_SCOPE.getId(),
        scopeCategoryCode: GENERAL_SCOPE.getCode(),
        state: ConsentState.Revoked,
        previousVersionNumber: 0,
        legalBasisVersion: 'v1',
      }),
    );

    const useCase = new GrantConsentUseCase(consentRepo, scopeUseCase, dispatcher);
    await useCase.execute(new GrantConsentCommand({ patientId, doctorId, scopeCode: 'general', legalBasisVersion: 'v1' }));

    assert.equal(consentRepo.saved.length, 2);
    assert.equal(consentRepo.saved[1].getVersionNumber(), 2);
    assert.equal(consentRepo.saved[1].getState(), ConsentState.Granted);
    assert.equal(dispatcher.dispatched.length, 1);
    assert.equal(dispatcher.dispatched[0].eventName, 'trust.consent.granted');
  });
});
