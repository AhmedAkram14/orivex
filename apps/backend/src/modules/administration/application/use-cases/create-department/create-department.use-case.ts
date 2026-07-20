import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { Department } from '../../../domain/entities/department.entity.js';
import type { DepartmentRepository } from '../../../domain/repositories/department.repository.js';
import type { HospitalRepository } from '../../../domain/repositories/hospital.repository.js';

import type { CreateDepartmentCommand } from './create-department.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// administration.module.ts only.
export class CreateDepartmentUseCase {
  constructor(
    private readonly hospitalRepository: HospitalRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(command: CreateDepartmentCommand): Promise<Department> {
    const hospital = await this.hospitalRepository.findById(command.hospitalId);
    if (!hospital) {
      throw new NotFoundError(`Hospital "${command.hospitalId}" not found.`);
    }

    const department = Department.create({ hospitalId: command.hospitalId, name: command.name });
    await this.departmentRepository.save(department);
    return department;
  }
}
