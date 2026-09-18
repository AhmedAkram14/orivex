// Knowledge Center Hardening (Phase 0), decision 5: a knowledge-owned
// language tag, deliberately NOT a cross-module import of identity's own
// `Language` enum (apps/backend/src/modules/identity/domain/enums/
// language.enum.ts). Knowledge's own *domain layer* (this folder and
// entities/) never imports another module's domain type -- it stays entirely
// self-contained. (Note: this is narrower than "the module never crosses
// boundaries" -- the *application* layer already imports other modules' use
// cases, e.g. GetDoctorProfileByAccountIdUseCase, and in one existing case
// (author-article.use-case.ts) another module's domain enum,
// VerificationSubjectType from trust. The rule this file follows is specific
// to knowledge's domain layer never depending on another module's domain
// layer.) Same string values as identity's Language for consistency in
// logs/exports, but independently defined here on purpose.
export enum KnowledgeArticleLanguage {
  Arabic = 'Arabic',
  English = 'English',
}
