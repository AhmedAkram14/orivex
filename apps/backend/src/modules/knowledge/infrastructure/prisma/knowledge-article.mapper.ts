import {
  KnowledgeArticleStatus as PrismaKnowledgeArticleStatus,
  KnowledgeArticleLanguage as PrismaKnowledgeArticleLanguage,
} from '@prisma/client';
import type { KnowledgeArticle as PrismaKnowledgeArticle } from '@prisma/client';

import { KnowledgeArticle } from '../../domain/entities/knowledge-article.entity.js';
import { KnowledgeArticleStatus } from '../../domain/enums/knowledge-article-status.enum.js';
import { KnowledgeArticleLanguage } from '../../domain/enums/knowledge-article-language.enum.js';

const DOMAIN_TO_PRISMA_STATUS: Record<KnowledgeArticleStatus, PrismaKnowledgeArticleStatus> = {
  [KnowledgeArticleStatus.Draft]: PrismaKnowledgeArticleStatus.DRAFT,
  [KnowledgeArticleStatus.PendingReview]: PrismaKnowledgeArticleStatus.PENDING_REVIEW,
  [KnowledgeArticleStatus.Published]: PrismaKnowledgeArticleStatus.PUBLISHED,
  [KnowledgeArticleStatus.Rejected]: PrismaKnowledgeArticleStatus.REJECTED,
  [KnowledgeArticleStatus.Archived]: PrismaKnowledgeArticleStatus.ARCHIVED,
};

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaKnowledgeArticleStatus, KnowledgeArticleStatus> = {
  [PrismaKnowledgeArticleStatus.DRAFT]: KnowledgeArticleStatus.Draft,
  [PrismaKnowledgeArticleStatus.PENDING_REVIEW]: KnowledgeArticleStatus.PendingReview,
  [PrismaKnowledgeArticleStatus.PUBLISHED]: KnowledgeArticleStatus.Published,
  [PrismaKnowledgeArticleStatus.REJECTED]: KnowledgeArticleStatus.Rejected,
  [PrismaKnowledgeArticleStatus.ARCHIVED]: KnowledgeArticleStatus.Archived,
};

const DOMAIN_TO_PRISMA_LANGUAGE: Record<KnowledgeArticleLanguage, PrismaKnowledgeArticleLanguage> = {
  [KnowledgeArticleLanguage.Arabic]: PrismaKnowledgeArticleLanguage.ARABIC,
  [KnowledgeArticleLanguage.English]: PrismaKnowledgeArticleLanguage.ENGLISH,
};

const PRISMA_TO_DOMAIN_LANGUAGE: Record<PrismaKnowledgeArticleLanguage, KnowledgeArticleLanguage> = {
  [PrismaKnowledgeArticleLanguage.ARABIC]: KnowledgeArticleLanguage.Arabic,
  [PrismaKnowledgeArticleLanguage.ENGLISH]: KnowledgeArticleLanguage.English,
};

export function toPrismaKnowledgeArticleStatus(status: KnowledgeArticleStatus): PrismaKnowledgeArticleStatus {
  return DOMAIN_TO_PRISMA_STATUS[status];
}

export function toDomainKnowledgeArticleLanguage(language: PrismaKnowledgeArticleLanguage): KnowledgeArticleLanguage {
  return PRISMA_TO_DOMAIN_LANGUAGE[language];
}

export function toPrismaKnowledgeArticleLanguage(language: KnowledgeArticleLanguage): PrismaKnowledgeArticleLanguage {
  return DOMAIN_TO_PRISMA_LANGUAGE[language];
}

export function toDomainKnowledgeArticle(row: PrismaKnowledgeArticle): KnowledgeArticle {
  return KnowledgeArticle.reconstitute({
    id: row.id,
    authoringDoctorId: row.authoringDoctorId,
    title: row.title,
    body: row.body,
    status: PRISMA_TO_DOMAIN_STATUS[row.status],
    language: toDomainKnowledgeArticleLanguage(row.language),
    specialtyId: row.specialtyId,
    sourcesText: row.sourcesText ?? undefined,
    viewCount: row.viewCount,
    moderationReason: row.moderationReason ?? undefined,
    moderatedByAccountId: row.moderatedByAccountId ?? undefined,
    moderatedAt: row.moderatedAt ?? undefined,
    publishedAt: row.publishedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
