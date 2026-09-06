import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsentScopeCategory } from '../../../../reference/domain/entities/consent-scope-category.entity.js';
import type { ConsentScopeCategoryRepository } from '../../../../reference/domain/repositories/consent-scope-category.repository.js';
import { GetConsentScopeCategoryByCodeUseCase } from '../../../../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { ConsentRecord } from '../../../domain/entities/consent-record.entity.js';
import { ConsentState } from '../../../domain/enums/consent-state.enum.js';
import { TrustDomainError } from '../../../domain/exceptions/trust-domain.error.js';
import type { ConsentRecordRepository } from '../../../domain/repositories/consent-record.repository.js';

import { GetConsentStateUseCase } from './get-consent-state.use-case.js';

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
  constructor(private readonly rows: ConsentRecord[] = []) {}
  async findCurrent(patientId: string, doctorId: string, scopeCategoryId: string): Promise<ConsentRecord | null> {
    const matches = this.rows.filter(
      (r) => r.getPatientId() === patientId && r.getDoctorId() === doctorId && r.getScopeCategoryId() === scopeCategoryId,
    );
    if (matches.length === 0) return null;
    return matches.reduce((latest, r) => (r.getVersionNumber() > latest.getVersionNumber() ? r : latest));
  }
  async findAllRevokedForPatient(): Promise<ConsentRecord[]> {
    return [];
  }
  async findAllForPatient(): Promise<ConsentRecord[]> {
    return this.rows;
  }
  async save(): Promise<void> {}
}

const PATIENT_ID = '22222222-2222-4222-8222-222222222222';
const DOCTOR_ID = '33333333-3333-4333-8333-333333333333';

describe('GetConsentStateUseCase', () => {
  it('defaults to Granted when no consent record has ever been written', async () => {
    const useCase = new GetConsentStateUseCase(
      new FakeConsentRecordRepository([]),
      new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository()),
    );

    const state = await useCase.execute({ patientId: PATIENT_ID, doctorId: DOCTOR_ID, scopeCode: 'general' });

    assert.equal(state, ConsentState.Granted);
  });

  it('reflects a revoked record', async () => {
    const revoked = ConsentRecord.recordChange({
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      scopeCategoryId: GENERAL_SCOPE.getId(),
      scopeCategoryCode: GENERAL_SCOPE.getCode(),
      state: ConsentState.Revoked,
      previousVersionNumber: 0,
      legalBasisVersion: 'v1',
    });
    const useCase = new GetConsentStateUseCase(
      new FakeConsentRecordRepository([revoked]),
      new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository()),
    );

    const state = await useCase.execute({ patientId: PATIENT_ID, doctorId: DOCTOR_ID, scopeCode: 'general' });

    assert.equal(state, ConsentState.Revoked);
  });

  it('reflects the latest version, not the first, when a revoke is later followed by a grant', async () => {
    const revoked = ConsentRecord.recordChange({
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      scopeCategoryId: GENERAL_SCOPE.getId(),
      scopeCategoryCode: GENERAL_SCOPE.getCode(),
      state: ConsentState.Revoked,
      previousVersionNumber: 0,
      legalBasisVersion: 'v1',
    });
    const reGranted = ConsentRecord.recordChange({
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      scopeCategoryId: GENERAL_SCOPE.getId(),
      scopeCategoryCode: GENERAL_SCOPE.getCode(),
      state: ConsentState.Granted,
      previousVersionNumber: revoked.getVersionNumber(),
      legalBasisVersion: 'v1',
    });
    const useCase = new GetConsentStateUseCase(
      new FakeConsentRecordRepository([revoked, reGranted]),
      new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository()),
    );

    const state = await useCase.execute({ patientId: PATIENT_ID, doctorId: DOCTOR_ID, scopeCode: 'general' });

    assert.equal(state, ConsentState.Granted);
  });

  it('throws when the scope code is not configured', async () => {
    const useCase = new GetConsentStateUseCase(
      new FakeConsentRecordRepository([]),
      new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository()),
    );

    await assert.rejects(
      () => useCase.execute({ patientId: PATIENT_ID, doctorId: DOCTOR_ID, scopeCode: 'mental_health' }),
      TrustDomainError,
    );
  });
});
