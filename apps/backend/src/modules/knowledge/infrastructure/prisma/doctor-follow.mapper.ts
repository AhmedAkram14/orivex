import type { DoctorFollow as PrismaDoctorFollow } from '@prisma/client';

import { DoctorFollow } from '../../domain/entities/doctor-follow.entity.js';

export function toDomainDoctorFollow(row: PrismaDoctorFollow): DoctorFollow {
  return DoctorFollow.reconstitute({
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    createdAt: row.createdAt,
  });
}
