import type { LabRequest as PrismaLabRequest } from '@prisma/client';

import { LabRequest } from '../../domain/entities/lab-request.entity.js';

import { toDomainLabRequestStatus } from './lab-request-status.mapper.js';

export function toDomainLabRequest(row: PrismaLabRequest): LabRequest {
  return LabRequest.reconstitute({
    id: row.id,
    consultationSessionId: row.consultationSessionId,
    authoringDoctorId: row.authoringDoctorId,
    testName: row.testName,
    clinicalReason: row.clinicalReason ?? undefined,
    instructions: row.instructions ?? undefined,
    status: toDomainLabRequestStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
