import type { ConsentScopeCategory } from '../entities/consent-scope-category.entity.js';

export interface ConsentScopeCategoryRepository {
  findAll(): Promise<ConsentScopeCategory[]>;
  findByCode(code: string): Promise<ConsentScopeCategory | null>;
}
