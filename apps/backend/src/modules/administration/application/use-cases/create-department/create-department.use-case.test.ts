import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Department } from '../../../domain/entities/department.entity.js';
import { Hospital } from '../../../domain/entities/hospital.entity.js';
import { DepartmentAlreadyExistsError } from '../../../domain/exceptions/department-already-exists.error.js';
import type { DepartmentRepository } from '../../../domain/repositories/department.repository.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';
import { NotFoundError } from '../../../../../shared/errors/app-error.js';

import { CreateDepartmentCommand } from './create-department.command.js';
import { CreateDepartmentUseCase } from './create-department.use-case.js';

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
  public readonly saved: Department[] = [];
  private readonly throwOnSave: Error | undefined;

  constructor(throwOnSave?: Error) {
    this.throwOnSave = throwOnSave;
  }

  findAllByHospitalId(): Promise<Department[]> {
    return Promise.resolve([]);
  }

  save(department: Department): Promise<void> {
    if (this.throwOnSave) {
      return Promise.reject(this.throwOnSave);
    }
    this.saved.push(department);
    return Promise.resolve();
  }
}

describe('CreateDepartmentUseCase', () => {
  it('creates and persists a department under an existing hospital', async () => {
    const hospital = Hospital.create({ name: 'Cairo General' });
    const departmentRepository = new FakeDepartmentRepository();
    const useCase = new CreateDepartmentUseCase(new FakeHospitalRepository(hospital), departmentRepository);

    const department = await useCase.execute(
      new CreateDepartmentCommand({ hospitalId: hospital.getId(), name: 'Radiology' }),
    );

    assert.equal(department.getName(), 'Radiology');
    assert.equal(department.getHospitalId(), hospital.getId());
    assert.equal(departmentRepository.saved.length, 1);
  });

  it('throws NotFoundError when the hospital does not exist', async () => {
    const useCase = new CreateDepartmentUseCase(new FakeHospitalRepository(null), new FakeDepartmentRepository());

    await assert.rejects(
      () =>
        useCase.execute(
          new CreateDepartmentCommand({ hospitalId: '11111111-1111-4111-8111-111111111111', name: 'Radiology' }),
        ),
      NotFoundError,
    );
  });

  it('propagates DepartmentAlreadyExistsError from a duplicate name within the same hospital', async () => {
    const hospital = Hospital.create({ name: 'Cairo General' });
    const departmentRepository = new FakeDepartmentRepository(
      new DepartmentAlreadyExistsError(hospital.getId(), 'Radiology'),
    );
    const useCase = new CreateDepartmentUseCase(new FakeHospitalRepository(hospital), departmentRepository);

    await assert.rejects(
      () => useCase.execute(new CreateDepartmentCommand({ hospitalId: hospital.getId(), name: 'Radiology' })),
      DepartmentAlreadyExistsError,
    );
  });
});
