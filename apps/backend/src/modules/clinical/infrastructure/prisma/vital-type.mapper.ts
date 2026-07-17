import { VitalType as PrismaVitalType } from '@prisma/client';

import { VitalType } from '../../domain/enums/vital-type.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lowercase-hyphen, matching the frontend's real VitalType contract exactly.
// Same translation-boundary pattern as notification-severity.mapper.ts.
const DOMAIN_TO_PRISMA: Record<VitalType, PrismaVitalType> = {
  [VitalType.Weight]: PrismaVitalType.WEIGHT,
  [VitalType.BloodPressure]: PrismaVitalType.BLOOD_PRESSURE,
  [VitalType.BloodSugar]: PrismaVitalType.BLOOD_SUGAR,
};

const PRISMA_TO_DOMAIN: Record<PrismaVitalType, VitalType> = {
  [PrismaVitalType.WEIGHT]: VitalType.Weight,
  [PrismaVitalType.BLOOD_PRESSURE]: VitalType.BloodPressure,
  [PrismaVitalType.BLOOD_SUGAR]: VitalType.BloodSugar,
};

export function toPrismaVitalType(value: VitalType): PrismaVitalType {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainVitalType(value: PrismaVitalType): VitalType {
  return PRISMA_TO_DOMAIN[value];
}
