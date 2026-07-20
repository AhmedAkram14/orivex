import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Hospital } from '../../../domain/entities/hospital.entity.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';

import { CreateHospitalCommand } from './create-hospital.command.js';
import { CreateHospitalUseCase } from './create-hospital.use-case.js';

class FakeHospitalRepository implements HospitalRepository {
  public readonly saved: Hospital[] = [];

  findAll(): Promise<Hospital[]> {
    return Promise.resolve([]);
  }

  findById(): Promise<Hospital | null> {
    return Promise.resolve(null);
  }

  save(hospital: Hospital): Promise<void> {
    this.saved.push(hospital);
    return Promise.resolve();
  }
}

describe('CreateHospitalUseCase', () => {
  it('creates and persists a new hospital', async () => {
    const repository = new FakeHospitalRepository();
    const useCase = new CreateHospitalUseCase(repository);

    const hospital = await useCase.execute(new CreateHospitalCommand({ name: 'Alexandria Medical Center' }));

    assert.equal(hospital.getName(), 'Alexandria Medical Center');
    assert.equal(repository.saved.length, 1);
    assert.equal(repository.saved[0], hospital);
  });

  it('stores an optional address when provided', async () => {
    const repository = new FakeHospitalRepository();
    const useCase = new CreateHospitalUseCase(repository);

    const hospital = await useCase.execute(
      new CreateHospitalCommand({ name: 'Giza Clinic', address: '12 Pyramids Rd' }),
    );

    assert.equal(hospital.getAddress(), '12 Pyramids Rd');
  });
});
