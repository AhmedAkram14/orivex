import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { Department } from '../../../domain/entities/department.entity.js';
import type { DepartmentRepository } from '../../../domain/repositories/department.repository.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';

import type { ListDepartmentsQuery } from './list-departments.query.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// administration.module.ts only.
export class ListDepartmentsUseCase {
  constructor(
    private readonly hospitalRepository: HospitalRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(query: ListDepartmentsQuery): Promise<Department[]> {
    const hospital = await this.hospitalRepository.findById(query.hospitalId);
    if (!hospital) {
      throw new NotFoundError(`Hospital "${query.hospitalId}" not found.`);
    }

    return this.departmentRepository.findAllByHospitalId(query.hospitalId);
  }
}
