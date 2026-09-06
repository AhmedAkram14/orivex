import type { ConsentScopeCategory as PrismaConsentScopeCategoryRow } from '@prisma/client';

import { ConsentScopeCategory } from '../../domain/entities/consent-scope-category.entity.js';

export function toDomainConsentScopeCategory(row: PrismaConsentScopeCategoryRow): ConsentScopeCategory {
  return ConsentScopeCategory.reconstitute({
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
