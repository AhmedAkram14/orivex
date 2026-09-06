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

import { RevokeConsentCommand } from './revoke-consent.command.js';
import { RevokeConsentUseCase } from './revoke-consent.use-case.js';

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

describe('RevokeConsentUseCase', () => {
  it('creates the first revoked record at version 1 when no prior record exists, and dispatches ConsentRevoked', async () => {
    const consentRepo = new FakeConsentRecordRepository();
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new RevokeConsentUseCase(
      consentRepo,
      new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository()),
      dispatcher,
    );

    await useCase.execute(
      new RevokeConsentCommand({
        patientId: '22222222-2222-4222-8222-222222222222',
        doctorId: '33333333-3333-4333-8333-333333333333',
        scopeCode: 'general',
        legalBasisVersion: 'v1',
      }),
    );

    assert.equal(consentRepo.saved.length, 1);
    assert.equal(consentRepo.saved[0].getVersionNumber(), 1);
    assert.equal(consentRepo.saved[0].getState(), ConsentState.Revoked);
    assert.equal(dispatcher.dispatched.length, 1);
    assert.equal(dispatcher.dispatched[0].eventName, 'trust.consent.revoked');
  });

  it('increments the version number on a repeated revoke rather than overwriting', async () => {
    const consentRepo = new FakeConsentRecordRepository();
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new RevokeConsentUseCase(
      consentRepo,
      new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository()),
      dispatcher,
    );
    const command = new RevokeConsentCommand({
      patientId: '22222222-2222-4222-8222-222222222222',
      doctorId: '33333333-3333-4333-8333-333333333333',
      scopeCode: 'general',
      legalBasisVersion: 'v1',
    });

    await useCase.execute(command);
    await useCase.execute(command);

    assert.equal(consentRepo.saved.length, 2);
    assert.equal(consentRepo.saved[1].getVersionNumber(), 2);
  });
});
