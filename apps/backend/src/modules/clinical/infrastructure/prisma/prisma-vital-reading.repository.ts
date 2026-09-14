import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { VitalReading } from '../../domain/entities/vital-reading.entity.js';
import { DuplicateWearableVitalReadingError } from '../../domain/exceptions/duplicate-wearable-vital-reading.error.js';
import type { VitalReadingRepository } from '../../domain/repositories/vital-reading.repository.js';

import { toDomainVitalReading, toPersistedVitalReading } from './vital-reading.mapper.js';

// K10 -- same precision as PrismaAccountRepository's own
// isUniqueConstraintViolation, but additionally checks *which* unique
// constraint fired via Prisma's error.meta.target: VitalReading has two
// unique constraints (its own `id`, and `(sourceProvider,
// externalObservationId)`), and only the latter should ever translate to
// DuplicateWearableVitalReadingError -- an `id` collision would be a
// different, genuinely unexpected bug that must not be silently swallowed.
function isSourceExternalIdConflict(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
  return fields.includes('sourceProvider') && fields.includes('externalObservationId');
}

@Injectable()
export class PrismaVitalReadingRepository implements VitalReadingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPatientId(patientId: string): Promise<VitalReading[]> {
    const rows = await this.prisma.vitalReading.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'asc' },
    });
    return rows.map(toDomainVitalReading);
  }

  async findByConsultationSessionId(consultationSessionId: string): Promise<VitalReading[]> {
    const rows = await this.prisma.vitalReading.findMany({
      where: { consultationSessionId },
      orderBy: { recordedAt: 'asc' },
    });
    return rows.map(toDomainVitalReading);
  }

  async findBySourceAndExternalId(sourceProvider: string, externalObservationId: string): Promise<VitalReading | null> {
    const row = await this.prisma.vitalReading.findFirst({
      where: { sourceProvider, externalObservationId },
    });
    return row ? toDomainVitalReading(row) : null;
  }

  async save(vitalReading: VitalReading): Promise<void> {
    const data = toPersistedVitalReading(vitalReading);
    try {
      await this.prisma.vitalReading.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isSourceExternalIdConflict(error) && data.sourceProvider && data.externalObservationId) {
        throw new DuplicateWearableVitalReadingError(data.sourceProvider, data.externalObservationId);
      }
      throw error;
    }
  }
}
