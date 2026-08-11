import type { AvailabilityWindow as PrismaAvailabilityWindowRow } from '@prisma/client';

import { AvailabilityWindow } from '../../domain/entities/availability-window.entity.js';

import { toDomainAvailabilityWindowStatus } from './availability-window-status.mapper.js';
import { toDomainConsultationPricing } from './consultation-pricing.mapper.js';

export function toDomainAvailabilityWindow(row: PrismaAvailabilityWindowRow): AvailabilityWindow {
  return AvailabilityWindow.reconstitute({
    id: row.id,
    doctorId: row.doctorId,
    startTime: row.startTime,
    endTime: row.endTime,
    pricing: toDomainConsultationPricing(row),
    status: toDomainAvailabilityWindowStatus(row.status),
    holdExpiresAt: row.holdExpiresAt ?? undefined,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
