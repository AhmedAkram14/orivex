import { Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetDoctorProfileByAccountIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { GetPatientProfileByAccountIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { TrustGuardsModule } from '../trust/trust-guards.module.js';
import { CheckIdentityVerificationStatusUseCase } from '../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';

import { ARTICLE_SAVE_REPOSITORY, DOCTOR_FOLLOW_REPOSITORY, KNOWLEDGE_ARTICLE_REPOSITORY } from './application/ports/tokens.js';
import { AuthorArticleUseCase } from './application/use-cases/author-article/author-article.use-case.js';
import { GetArticleByIdUseCase } from './application/use-cases/get-article-by-id/get-article-by-id.use-case.js';
import { ListMyArticlesUseCase } from './application/use-cases/list-my-articles/list-my-articles.use-case.js';
import { ListPublishedArticlesUseCase } from './application/use-cases/list-published-articles/list-published-articles.use-case.js';
import { ModerateArticleUseCase } from './application/use-cases/moderate-article/moderate-article.use-case.js';
import { ListArticlesByStatusUseCase } from './application/use-cases/list-articles-by-status/list-articles-by-status.use-case.js';
import { FollowDoctorUseCase } from './application/use-cases/follow-doctor/follow-doctor.use-case.js';
import { UnfollowDoctorUseCase } from './application/use-cases/unfollow-doctor/unfollow-doctor.use-case.js';
import { ListFollowedDoctorsUseCase } from './application/use-cases/list-followed-doctors/list-followed-doctors.use-case.js';
import { SaveArticleUseCase } from './application/use-cases/save-article/save-article.use-case.js';
import { UnsaveArticleUseCase } from './application/use-cases/unsave-article/unsave-article.use-case.js';
import { ListSavedArticlesUseCase } from './application/use-cases/list-saved-articles/list-saved-articles.use-case.js';
import type { ArticleSaveRepository } from './domain/repositories/article-save.repository.js';
import type { DoctorFollowRepository } from './domain/repositories/doctor-follow.repository.js';
import type { KnowledgeArticleRepository } from './domain/repositories/knowledge-article.repository.js';
import { PrismaArticleSaveRepository } from './infrastructure/prisma/prisma-article-save.repository.js';
import { PrismaDoctorFollowRepository } from './infrastructure/prisma/prisma-doctor-follow.repository.js';
import { PrismaKnowledgeArticleRepository } from './infrastructure/prisma/prisma-knowledge-article.repository.js';
import { KnowledgeController } from './presentation/controllers/knowledge.controller.js';

// I13 -- Knowledge Center (docs/01.1-prd-update.md §6). Imports
// DoctorModule/PatientModule/TrustGuardsModule only to consume their own
// exported use cases (module-to-module calls only through a published
// interface, never another module's repository -- docs/10-backend-
// architecture.md Section 11). TrustGuardsModule (not the fuller
// TrustModule) is enough -- CheckIdentityVerificationStatusUseCase is all
// this module needs, same reasoning Consultation/Payment/Asset already
// established for importing the lighter guards-only module.
@Module({
  imports: [DoctorModule, PatientModule, TrustGuardsModule, AuthenticationGuardsModule],
  controllers: [KnowledgeController],
  providers: [
    { provide: KNOWLEDGE_ARTICLE_REPOSITORY, useClass: PrismaKnowledgeArticleRepository },
    { provide: DOCTOR_FOLLOW_REPOSITORY, useClass: PrismaDoctorFollowRepository },
    { provide: ARTICLE_SAVE_REPOSITORY, useClass: PrismaArticleSaveRepository },
    {
      provide: AuthorArticleUseCase,
      useFactory: (
        repository: KnowledgeArticleRepository,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
        checkIdentityVerificationStatusUseCase: CheckIdentityVerificationStatusUseCase,
      ) => new AuthorArticleUseCase(repository, getDoctorProfileByAccountIdUseCase, checkIdentityVerificationStatusUseCase),
      inject: [KNOWLEDGE_ARTICLE_REPOSITORY, GetDoctorProfileByAccountIdUseCase, CheckIdentityVerificationStatusUseCase],
    },
    {
      provide: GetArticleByIdUseCase,
      useFactory: (repository: KnowledgeArticleRepository, getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase) =>
        new GetArticleByIdUseCase(repository, getDoctorProfileByAccountIdUseCase),
      inject: [KNOWLEDGE_ARTICLE_REPOSITORY, GetDoctorProfileByAccountIdUseCase],
    },
    {
      provide: ListMyArticlesUseCase,
      useFactory: (repository: KnowledgeArticleRepository, getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase) =>
        new ListMyArticlesUseCase(repository, getDoctorProfileByAccountIdUseCase),
      inject: [KNOWLEDGE_ARTICLE_REPOSITORY, GetDoctorProfileByAccountIdUseCase],
    },
    {
      provide: ListPublishedArticlesUseCase,
      useFactory: (repository: KnowledgeArticleRepository) => new ListPublishedArticlesUseCase(repository),
      inject: [KNOWLEDGE_ARTICLE_REPOSITORY],
    },
    {
      provide: ModerateArticleUseCase,
      useFactory: (repository: KnowledgeArticleRepository) => new ModerateArticleUseCase(repository),
      inject: [KNOWLEDGE_ARTICLE_REPOSITORY],
    },
    {
      provide: ListArticlesByStatusUseCase,
      useFactory: (repository: KnowledgeArticleRepository) => new ListArticlesByStatusUseCase(repository),
      inject: [KNOWLEDGE_ARTICLE_REPOSITORY],
    },
    {
      provide: FollowDoctorUseCase,
      useFactory: (
        repository: DoctorFollowRepository,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
      ) => new FollowDoctorUseCase(repository, getPatientProfileByAccountIdUseCase, getDoctorProfileByIdUseCase),
      inject: [DOCTOR_FOLLOW_REPOSITORY, GetPatientProfileByAccountIdUseCase, GetDoctorProfileByIdUseCase],
    },
    {
      provide: UnfollowDoctorUseCase,
      useFactory: (repository: DoctorFollowRepository, getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase) =>
        new UnfollowDoctorUseCase(repository, getPatientProfileByAccountIdUseCase),
      inject: [DOCTOR_FOLLOW_REPOSITORY, GetPatientProfileByAccountIdUseCase],
    },
    {
      provide: ListFollowedDoctorsUseCase,
      useFactory: (repository: DoctorFollowRepository, getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase) =>
        new ListFollowedDoctorsUseCase(repository, getPatientProfileByAccountIdUseCase),
      inject: [DOCTOR_FOLLOW_REPOSITORY, GetPatientProfileByAccountIdUseCase],
    },
    {
      provide: SaveArticleUseCase,
      useFactory: (
        articleSaveRepository: ArticleSaveRepository,
        knowledgeArticleRepository: KnowledgeArticleRepository,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
      ) => new SaveArticleUseCase(articleSaveRepository, knowledgeArticleRepository, getPatientProfileByAccountIdUseCase),
      inject: [ARTICLE_SAVE_REPOSITORY, KNOWLEDGE_ARTICLE_REPOSITORY, GetPatientProfileByAccountIdUseCase],
    },
    {
      provide: UnsaveArticleUseCase,
      useFactory: (repository: ArticleSaveRepository, getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase) =>
        new UnsaveArticleUseCase(repository, getPatientProfileByAccountIdUseCase),
      inject: [ARTICLE_SAVE_REPOSITORY, GetPatientProfileByAccountIdUseCase],
    },
    {
      provide: ListSavedArticlesUseCase,
      useFactory: (repository: ArticleSaveRepository, getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase) =>
        new ListSavedArticlesUseCase(repository, getPatientProfileByAccountIdUseCase),
      inject: [ARTICLE_SAVE_REPOSITORY, GetPatientProfileByAccountIdUseCase],
    },
  ],
  exports: [ListArticlesByStatusUseCase, ModerateArticleUseCase],
})
export class KnowledgeModule {}
