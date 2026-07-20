import type { Hospital } from '../../domain/entities/hospital.entity.js';

export class HospitalResponseDto {
  id!: string;
  name!: string;
  address?: string;
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(hospital: Hospital): HospitalResponseDto {
    const dto = new HospitalResponseDto();
    dto.id = hospital.getId();
    dto.name = hospital.getName();
    dto.address = hospital.getAddress();
    dto.createdAt = hospital.getCreatedAt().toISOString();
    dto.updatedAt = hospital.getUpdatedAt().toISOString();
    return dto;
  }
}
