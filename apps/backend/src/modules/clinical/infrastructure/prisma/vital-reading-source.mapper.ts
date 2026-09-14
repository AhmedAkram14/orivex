import { VitalReadingSource as PrismaVitalReadingSource } from '@prisma/client';

import { VitalReadingSource } from '../../domain/enums/vital-reading-source.enum.js';

// Same translation-boundary pattern as vital-type.mapper.ts -- Prisma's enum
// is UPPER_SNAKE (database convention), the domain enum is lowercase-hyphen.
const DOMAIN_TO_PRISMA: Record<VitalReadingSource, PrismaVitalReadingSource> = {
  [VitalReadingSource.Clinical]: PrismaVitalReadingSource.CLINICAL,
  [VitalReadingSource.PatientReported]: PrismaVitalReadingSource.PATIENT_REPORTED,
  [VitalReadingSource.Device]: PrismaVitalReadingSource.DEVICE,
};

const PRISMA_TO_DOMAIN: Record<PrismaVitalReadingSource, VitalReadingSource> = {
  [PrismaVitalReadingSource.CLINICAL]: VitalReadingSource.Clinical,
  [PrismaVitalReadingSource.PATIENT_REPORTED]: VitalReadingSource.PatientReported,
  [PrismaVitalReadingSource.DEVICE]: VitalReadingSource.Device,
};

export function toPrismaVitalReadingSource(value: VitalReadingSource): PrismaVitalReadingSource {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainVitalReadingSource(value: PrismaVitalReadingSource): VitalReadingSource {
  return PRISMA_TO_DOMAIN[value];
}
