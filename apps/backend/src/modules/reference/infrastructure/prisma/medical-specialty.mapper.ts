import type { MedicalSpecialty as PrismaMedicalSpecialtyRow } from '@prisma/client';

import { MedicalSpecialty } from '../../domain/entities/medical-specialty.entity.js';

export function toDomainMedicalSpecialty(row: PrismaMedicalSpecialtyRow): MedicalSpecialty {
  return MedicalSpecialty.reconstitute({
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
