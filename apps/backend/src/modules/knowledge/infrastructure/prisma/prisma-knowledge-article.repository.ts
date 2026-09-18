import { Injectable } from '@nestjs/common';
import { KnowledgeArticleStatus as PrismaKnowledgeArticleStatus } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { KnowledgeArticle } from '../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleLanguage } from '../../domain/enums/knowledge-article-language.enum.js';
import type { KnowledgeArticleStatus } from '../../domain/enums/knowledge-article-status.enum.js';
import type { KnowledgeArticleRepository } from '../../domain/repositories/knowledge-article.repository.js';

import {
  toDomainKnowledgeArticle,
  toPrismaKnowledgeArticleStatus,
  toPrismaKnowledgeArticleLanguage,
} from './knowledge-article.mapper.js';

@Injectable()
export class PrismaKnowledgeArticleRepository implements KnowledgeArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<KnowledgeArticle | null> {
    const row = await this.prisma.knowledgeArticle.findUnique({ where: { id } });
    return row ? toDomainKnowledgeArticle(row) : null;
  }

  async listPublished(
    page: number,
    limit: number,
    doctorId?: string,
    language?: KnowledgeArticleLanguage,
  ): Promise<{ articles: KnowledgeArticle[]; total: number }> {
    const where = {
      status: PrismaKnowledgeArticleStatus.PUBLISHED,
      authoringDoctorId: doctorId,
      language: language ? toPrismaKnowledgeArticleLanguage(language) : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);
    return { articles: rows.map(toDomainKnowledgeArticle), total };
  }

  async listByAuthor(authoringDoctorId: string): Promise<KnowledgeArticle[]> {
    const rows = await this.prisma.knowledgeArticle.findMany({
      where: { authoringDoctorId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomainKnowledgeArticle);
  }

  async listByStatus(
    status: KnowledgeArticleStatus,
    page: number,
    limit: number,
  ): Promise<{ articles: KnowledgeArticle[]; total: number }> {
    const where = { status: toPrismaKnowledgeArticleStatus(status) };
    const [rows, total] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);
    return { articles: rows.map(toDomainKnowledgeArticle), total };
  }

  async countEverPublishedByAuthor(authoringDoctorId: string): Promise<number> {
    return this.prisma.knowledgeArticle.count({
      where: {
        authoringDoctorId,
        status: { in: [PrismaKnowledgeArticleStatus.PUBLISHED, PrismaKnowledgeArticleStatus.ARCHIVED] },
      },
    });
  }

  async save(article: KnowledgeArticle): Promise<void> {
    await this.prisma.knowledgeArticle.create({
      data: {
        id: article.getId(),
        authoringDoctorId: article.getAuthoringDoctorId(),
        title: article.getTitle(),
        body: article.getBody(),
        status: toPrismaKnowledgeArticleStatus(article.getStatus()),
        language: toPrismaKnowledgeArticleLanguage(article.getLanguage()),
        specialtyId: article.getSpecialtyId(),
        sourcesText: article.getSourcesText() ?? null,
        viewCount: article.getViewCount(),
        publishedAt: article.getPublishedAt() ?? null,
        createdAt: article.getCreatedAt(),
        updatedAt: article.getUpdatedAt(),
      },
    });
  }

  // Knowledge Center Hardening Phase 0: widened beyond moderate()'s own
  // moderation-only columns -- edit()/recordView()/unpublish()/
  // submitForReview() now also flow through this same update() path, and
  // must not have their content/view-count changes silently dropped.
  async update(article: KnowledgeArticle): Promise<void> {
    await this.prisma.knowledgeArticle.update({
      where: { id: article.getId() },
      data: {
        title: article.getTitle(),
        body: article.getBody(),
        status: toPrismaKnowledgeArticleStatus(article.getStatus()),
        language: toPrismaKnowledgeArticleLanguage(article.getLanguage()),
        specialtyId: article.getSpecialtyId(),
        sourcesText: article.getSourcesText() ?? null,
        viewCount: article.getViewCount(),
        moderationReason: article.getModerationReason() ?? null,
        moderatedByAccountId: article.getModeratedByAccountId() ?? null,
        moderatedAt: article.getModeratedAt() ?? null,
        publishedAt: article.getPublishedAt() ?? null,
        updatedAt: article.getUpdatedAt(),
      },
    });
  }
}
