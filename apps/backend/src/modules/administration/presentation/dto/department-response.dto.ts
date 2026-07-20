import type { Department } from '../../domain/entities/department.entity.js';

export class DepartmentResponseDto {
  id!: string;
  hospitalId!: string;
  name!: string;
  createdAt!: string;

  static fromDomain(department: Department): DepartmentResponseDto {
    const dto = new DepartmentResponseDto();
    dto.id = department.getId();
    dto.hospitalId = department.getHospitalId();
    dto.name = department.getName();
    dto.createdAt = department.getCreatedAt().toISOString();
    return dto;
  }
}
