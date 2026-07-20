import type { Department } from '../entities/department.entity.js';

export interface DepartmentRepository {
  findAllByHospitalId(hospitalId: string): Promise<Department[]>;
  save(department: Department): Promise<void>;
}
