import { HealthPassportEntryCategory as PrismaHealthPassportEntryCategory } from '@prisma/client';

import { HealthPassportEntryCategory } from '../../domain/enums/health-passport-entry-category.enum.js';

const DOMAIN_TO_PRISMA: Record<HealthPassportEntryCategory, PrismaHealthPassportEntryCategory> = {
  [HealthPassportEntryCategory.Vaccination]: PrismaHealthPassportEntryCategory.VACCINATION,
  [HealthPassportEntryCategory.FamilyHistory]: PrismaHealthPassportEntryCategory.FAMILY_HISTORY,
  [HealthPassportEntryCategory.Surgery]: PrismaHealthPassportEntryCategory.SURGERY,
  [HealthPassportEntryCategory.Medication]: PrismaHealthPassportEntryCategory.MEDICATION,
};

const PRISMA_TO_DOMAIN: Record<PrismaHealthPassportEntryCategory, HealthPassportEntryCategory> = {
  [PrismaHealthPassportEntryCategory.VACCINATION]: HealthPassportEntryCategory.Vaccination,
  [PrismaHealthPassportEntryCategory.FAMILY_HISTORY]: HealthPassportEntryCategory.FamilyHistory,
  [PrismaHealthPassportEntryCategory.SURGERY]: HealthPassportEntryCategory.Surgery,
  [PrismaHealthPassportEntryCategory.MEDICATION]: HealthPassportEntryCategory.Medication,
};

export function toPrismaHealthPassportEntryCategory(category: HealthPassportEntryCategory): PrismaHealthPassportEntryCategory {
  return DOMAIN_TO_PRISMA[category];
}

export function toDomainHealthPassportEntryCategory(category: PrismaHealthPassportEntryCategory): HealthPassportEntryCategory {
  return PRISMA_TO_DOMAIN[category];
}
