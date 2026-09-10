import type { KnowledgeArticle } from '../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleStatus } from '../../domain/enums/knowledge-article-status.enum.js';

export class KnowledgeArticleResponseDto {
  id!: string;
  authoringDoctorId!: string;
  title!: string;
  body!: string;
  status!: KnowledgeArticleStatus;
  moderationReason!: string | null;
  moderatedByAccountId!: string | null;
  moderatedAt!: string | null;
  publishedAt!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(article: KnowledgeArticle): KnowledgeArticleResponseDto {
    const dto = new KnowledgeArticleResponseDto();
    dto.id = article.getId();
    dto.authoringDoctorId = article.getAuthoringDoctorId();
    dto.title = article.getTitle();
    dto.body = article.getBody();
    dto.status = article.getStatus();
    dto.moderationReason = article.getModerationReason() ?? null;
    dto.moderatedByAccountId = article.getModeratedByAccountId() ?? null;
    dto.moderatedAt = article.getModeratedAt()?.toISOString() ?? null;
    dto.publishedAt = article.getPublishedAt()?.toISOString() ?? null;
    dto.createdAt = article.getCreatedAt().toISOString();
    dto.updatedAt = article.getUpdatedAt().toISOString();
    return dto;
  }
}
