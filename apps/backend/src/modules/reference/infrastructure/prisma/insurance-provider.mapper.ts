import type { InsuranceProvider as PrismaInsuranceProviderRow } from '@prisma/client';

import { InsuranceProvider } from '../../domain/entities/insurance-provider.entity.js';

export function toDomainInsuranceProvider(row: PrismaInsuranceProviderRow): InsuranceProvider {
  return InsuranceProvider.reconstitute({
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
