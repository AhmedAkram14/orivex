import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ArticleSave } from '../../domain/entities/article-save.entity.js';
import type { ArticleSaveRepository } from '../../domain/repositories/article-save.repository.js';

import { toDomainArticleSave } from './article-save.mapper.js';

@Injectable()
export class PrismaArticleSaveRepository implements ArticleSaveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByArticleAndPatient(articleId: string, patientId: string): Promise<ArticleSave | null> {
    const row = await this.prisma.knowledgeArticleSave.findUnique({
      where: { articleId_patientId: { articleId, patientId } },
    });
    return row ? toDomainArticleSave(row) : null;
  }

  async listByPatientId(patientId: string): Promise<ArticleSave[]> {
    const rows = await this.prisma.knowledgeArticleSave.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toDomainArticleSave);
  }

  async save(articleSave: ArticleSave): Promise<void> {
    await this.prisma.knowledgeArticleSave.create({
      data: {
        id: articleSave.getId(),
        articleId: articleSave.getArticleId(),
        patientId: articleSave.getPatientId(),
        createdAt: articleSave.getCreatedAt(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.knowledgeArticleSave.delete({ where: { id } });
  }
}
