import type { Country as PrismaCountryRow } from '@prisma/client';

import { Country } from '../../domain/entities/country.entity.js';

export function toDomainCountry(row: PrismaCountryRow): Country {
  return Country.reconstitute({
    id: row.id,
    name: row.name,
    iso2Code: row.iso2Code,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
