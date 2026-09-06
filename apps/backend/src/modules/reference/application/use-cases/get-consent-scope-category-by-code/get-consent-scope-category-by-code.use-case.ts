import type { ConsentScopeCategory } from '../../../domain/entities/consent-scope-category.entity.js';
import type { ConsentScopeCategoryRepository } from '../../../domain/repositories/consent-scope-category.repository.js';

export interface GetConsentScopeCategoryByCodeQuery {
  code: string;
}

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// reference.module.ts only. TrustModule's Grant/Revoke consent use cases
// call this to resolve a stable code (e.g. "general") to the real row id
// their ConsentRecord writes need -- a legitimate module-to-module use-case
// call, never a direct query of ReferenceModule's own repository.
export class GetConsentScopeCategoryByCodeUseCase {
  constructor(private readonly consentScopeCategoryRepository: ConsentScopeCategoryRepository) {}

  async execute(query: GetConsentScopeCategoryByCodeQuery): Promise<ConsentScopeCategory | null> {
    return this.consentScopeCategoryRepository.findByCode(query.code);
  }
}
