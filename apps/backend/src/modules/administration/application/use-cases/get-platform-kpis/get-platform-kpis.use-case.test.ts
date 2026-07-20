import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ListAccountsQuery } from '../../../../identity/application/use-cases/list-accounts/list-accounts.query.js';
import type { ListAccountsUseCase } from '../../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import { Hospital } from '../../../domain/entities/hospital.entity.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';

import { GetPlatformKpisUseCase } from './get-platform-kpis.use-case.js';

class FakeListAccountsUseCase implements Pick<ListAccountsUseCase, 'execute'> {
  public readonly calls: ListAccountsQuery[] = [];

  execute(query: ListAccountsQuery): Promise<{ accounts: []; total: number }> {
    this.calls.push(query);
    const total = query.role === AccountRole.Doctor ? 4 : query.role === AccountRole.Patient ? 12 : 0;
    return Promise.resolve({ accounts: [], total });
  }
}

class FakeHospitalRepository implements HospitalRepository {
  constructor(private readonly hospitals: Hospital[]) {}

  findAll(): Promise<Hospital[]> {
    return Promise.resolve(this.hospitals);
  }

  findById(): Promise<Hospital | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

describe('GetPlatformKpisUseCase', () => {
  it('aggregates active doctor/patient counts and hospital count', async () => {
    const listAccounts = new FakeListAccountsUseCase();
    const hospitalRepository = new FakeHospitalRepository([Hospital.create({ name: 'A' }), Hospital.create({ name: 'B' })]);
    const useCase = new GetPlatformKpisUseCase(listAccounts as unknown as ListAccountsUseCase, hospitalRepository);

    const result = await useCase.execute();

    assert.equal(result.activeDoctorCount, 4);
    assert.equal(result.activePatientCount, 12);
    assert.equal(result.hospitalCount, 2);
    assert.equal(listAccounts.calls.length, 2);
    assert.equal(listAccounts.calls[0].role, AccountRole.Doctor);
    assert.equal(listAccounts.calls[1].role, AccountRole.Patient);
  });
});
