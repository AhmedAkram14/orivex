import type { KnowledgeArticleSave as PrismaArticleSave } from '@prisma/client';

import { ArticleSave } from '../../domain/entities/article-save.entity.js';

export function toDomainArticleSave(row: PrismaArticleSave): ArticleSave {
  return ArticleSave.reconstitute({
    id: row.id,
    articleId: row.articleId,
    patientId: row.patientId,
    createdAt: row.createdAt,
  });
}
