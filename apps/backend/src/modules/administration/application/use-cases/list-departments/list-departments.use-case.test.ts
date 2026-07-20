import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Department } from '../../../domain/entities/department.entity.js';
import { Hospital } from '../../../domain/entities/hospital.entity.js';
import type { DepartmentRepository } from '../../../domain/repositories/department.repository.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';
import { NotFoundError } from '../../../../../shared/errors/app-error.js';

import { ListDepartmentsQuery } from './list-departments.query.js';
import { ListDepartmentsUseCase } from './list-departments.use-case.js';

class FakeHospitalRepository implements HospitalRepository {
  constructor(private readonly hospital: Hospital | null) {}

  findAll(): Promise<Hospital[]> {
    return Promise.resolve(this.hospital ? [this.hospital] : []);
  }

  findById(): Promise<Hospital | null> {
    return Promise.resolve(this.hospital);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeDepartmentRepository implements DepartmentRepository {
  constructor(private readonly departments: Department[]) {}

  findAllByHospitalId(): Promise<Department[]> {
    return Promise.resolve(this.departments);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ListDepartmentsUseCase', () => {
  it('returns every department for an existing hospital', async () => {
    const hospital = Hospital.create({ name: 'Cairo General' });
    const department = Department.create({ hospitalId: hospital.getId(), name: 'Cardiology' });
    const useCase = new ListDepartmentsUseCase(
      new FakeHospitalRepository(hospital),
      new FakeDepartmentRepository([department]),
    );

    const result = await useCase.execute(new ListDepartmentsQuery({ hospitalId: hospital.getId() }));

    assert.deepEqual(result, [department]);
  });

  it('throws NotFoundError when the hospital does not exist', async () => {
    const useCase = new ListDepartmentsUseCase(new FakeHospitalRepository(null), new FakeDepartmentRepository([]));

    await assert.rejects(
      () => useCase.execute(new ListDepartmentsQuery({ hospitalId: '11111111-1111-4111-8111-111111111111' })),
      NotFoundError,
    );
  });
});
