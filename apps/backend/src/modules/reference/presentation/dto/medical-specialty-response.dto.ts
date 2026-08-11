import type { MedicalSpecialty } from '../../domain/entities/medical-specialty.entity.js';

export class MedicalSpecialtyResponseDto {
  id!: string;
  name!: string;
  nameAr!: string | null;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(specialty: MedicalSpecialty): MedicalSpecialtyResponseDto {
    const dto = new MedicalSpecialtyResponseDto();
    dto.id = specialty.getId();
    dto.name = specialty.getName();
    dto.nameAr = specialty.getNameAr() ?? null;
    dto.isActive = specialty.getIsActive();
    dto.createdAt = specialty.getCreatedAt().toISOString();
    dto.updatedAt = specialty.getUpdatedAt().toISOString();
    return dto;
  }
}
