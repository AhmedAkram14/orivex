import type { Hospital as PrismaHospitalRow } from '@prisma/client';

import { Hospital } from '../../domain/entities/hospital.entity.js';

export function toDomainHospital(row: PrismaHospitalRow): Hospital {
  return Hospital.reconstitute({
    id: row.id,
    name: row.name,
    address: row.address,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
