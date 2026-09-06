import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsentScopeCategory } from '../../../../reference/domain/entities/consent-scope-category.entity.js';
import type { ConsentScopeCategoryRepository } from '../../../../reference/domain/repositories/consent-scope-category.repository.js';
import { GetConsentScopeCategoryByCodeUseCase } from '../../../../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { ConsentRecord } from '../../../domain/entities/consent-record.entity.js';
import { ConsentState } from '../../../domain/enums/consent-state.enum.js';
import type { ConsentRecordRepository } from '../../../domain/repositories/consent-record.repository.js';

import { ListRevokedDoctorsForPatientUseCase } from './list-revoked-doctors-for-patient.use-case.js';

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
  constructor(private readonly revoked: ConsentRecord[]) {}
  async findCurrent(): Promise<ConsentRecord | null> {
    return null;
  }
  async findAllRevokedForPatient(): Promise<ConsentRecord[]> {
    return this.revoked;
  }
  async findAllForPatient(): Promise<ConsentRecord[]> {
    return this.revoked;
  }
  async save(): Promise<void> {}
}

describe('ListRevokedDoctorsForPatientUseCase', () => {
  it('returns the doctor ids the repository reports as currently revoked', async () => {
    const patientId = '22222222-2222-4222-8222-222222222222';
    const revokedDoctorId = '33333333-3333-4333-8333-333333333333';
    const revoked = ConsentRecord.recordChange({
      patientId,
      doctorId: revokedDoctorId,
      scopeCategoryId: GENERAL_SCOPE.getId(),
      scopeCategoryCode: GENERAL_SCOPE.getCode(),
      state: ConsentState.Revoked,
      previousVersionNumber: 0,
      legalBasisVersion: 'v1',
    });
    const useCase = new ListRevokedDoctorsForPatientUseCase(
      new FakeConsentRecordRepository([revoked]),
      new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository()),
    );

    const result = await useCase.execute({ patientId, scopeCode: 'general' });

    assert.ok(result.has(revokedDoctorId));
    assert.equal(result.size, 1);
  });
});
