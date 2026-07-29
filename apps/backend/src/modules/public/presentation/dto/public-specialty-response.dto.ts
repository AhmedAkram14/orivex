import type { PublicSpecialty } from '../../application/use-cases/list-public-specialties/list-public-specialties.use-case.js';

export class PublicSpecialtyResponseDto {
  id!: string;
  name!: string;
  doctorCount!: number;

  static fromDomain(specialty: PublicSpecialty): PublicSpecialtyResponseDto {
    const dto = new PublicSpecialtyResponseDto();
    dto.id = specialty.id;
    dto.name = specialty.name;
    dto.doctorCount = specialty.doctorCount;
    return dto;
  }
}
