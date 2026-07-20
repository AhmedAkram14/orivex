import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Hospital } from '../../../domain/entities/hospital.entity.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';

import { ListHospitalsUseCase } from './list-hospitals.use-case.js';

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

describe('ListHospitalsUseCase', () => {
  it('returns every hospital from the repository', async () => {
    const hospital = Hospital.create({ name: 'Cairo General' });
    const repository = new FakeHospitalRepository([hospital]);
    const useCase = new ListHospitalsUseCase(repository);

    const result = await useCase.execute();

    assert.deepEqual(result, [hospital]);
  });
});
