import { KnowledgeArticleStatus as PrismaKnowledgeArticleStatus } from '@prisma/client';
import type { KnowledgeArticle as PrismaKnowledgeArticle } from '@prisma/client';

import { KnowledgeArticle } from '../../domain/entities/knowledge-article.entity.js';
import { KnowledgeArticleStatus } from '../../domain/enums/knowledge-article-status.enum.js';

const DOMAIN_TO_PRISMA_STATUS: Record<KnowledgeArticleStatus, PrismaKnowledgeArticleStatus> = {
  [KnowledgeArticleStatus.PendingReview]: PrismaKnowledgeArticleStatus.PENDING_REVIEW,
  [KnowledgeArticleStatus.Published]: PrismaKnowledgeArticleStatus.PUBLISHED,
  [KnowledgeArticleStatus.Rejected]: PrismaKnowledgeArticleStatus.REJECTED,
  [KnowledgeArticleStatus.Archived]: PrismaKnowledgeArticleStatus.ARCHIVED,
};

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaKnowledgeArticleStatus, KnowledgeArticleStatus> = {
  [PrismaKnowledgeArticleStatus.PENDING_REVIEW]: KnowledgeArticleStatus.PendingReview,
  [PrismaKnowledgeArticleStatus.PUBLISHED]: KnowledgeArticleStatus.Published,
  [PrismaKnowledgeArticleStatus.REJECTED]: KnowledgeArticleStatus.Rejected,
  [PrismaKnowledgeArticleStatus.ARCHIVED]: KnowledgeArticleStatus.Archived,
};

export function toPrismaKnowledgeArticleStatus(status: KnowledgeArticleStatus): PrismaKnowledgeArticleStatus {
  return DOMAIN_TO_PRISMA_STATUS[status];
}

export function toDomainKnowledgeArticle(row: PrismaKnowledgeArticle): KnowledgeArticle {
  return KnowledgeArticle.reconstitute({
    id: row.id,
    authoringDoctorId: row.authoringDoctorId,
    title: row.title,
    body: row.body,
    status: PRISMA_TO_DOMAIN_STATUS[row.status],
    moderationReason: row.moderationReason ?? undefined,
    moderatedByAccountId: row.moderatedByAccountId ?? undefined,
    moderatedAt: row.moderatedAt ?? undefined,
    publishedAt: row.publishedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
