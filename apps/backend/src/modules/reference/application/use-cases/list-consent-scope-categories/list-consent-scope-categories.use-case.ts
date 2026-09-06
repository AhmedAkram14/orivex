import type { ConsentScopeCategory } from '../../../domain/entities/consent-scope-category.entity.js';
import type { ConsentScopeCategoryRepository } from '../../../domain/repositories/consent-scope-category.repository.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only. Lets a consumer resolve an arbitrary
// ConsentRecord row's scopeCategoryId back to its stable code (e.g. for a
// history listing spanning more than one category), without one lookup
// call per row.
export class ListConsentScopeCategoriesUseCase {
  constructor(private readonly consentScopeCategoryRepository: ConsentScopeCategoryRepository) {}

  async execute(): Promise<ConsentScopeCategory[]> {
    return this.consentScopeCategoryRepository.findAll();
  }
}
