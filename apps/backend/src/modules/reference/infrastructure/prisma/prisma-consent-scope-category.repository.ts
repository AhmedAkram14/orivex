import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ConsentScopeCategory } from '../../domain/entities/consent-scope-category.entity.js';
import type { ConsentScopeCategoryRepository } from '../../domain/repositories/consent-scope-category.repository.js';

import { toDomainConsentScopeCategory } from './consent-scope-category.mapper.js';

@Injectable()
export class PrismaConsentScopeCategoryRepository implements ConsentScopeCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ConsentScopeCategory[]> {
    const rows = await this.prisma.consentScopeCategory.findMany({ orderBy: { code: 'asc' } });
    return rows.map(toDomainConsentScopeCategory);
  }

  async findByCode(code: string): Promise<ConsentScopeCategory | null> {
    const row = await this.prisma.consentScopeCategory.findUnique({ where: { code } });
    return row ? toDomainConsentScopeCategory(row) : null;
  }
}
