import type { ArticleSave } from '../../domain/entities/article-save.entity.js';

export class ArticleSaveResponseDto {
  id!: string;
  articleId!: string;
  createdAt!: string;

  static fromDomain(articleSave: ArticleSave): ArticleSaveResponseDto {
    const dto = new ArticleSaveResponseDto();
    dto.id = articleSave.getId();
    dto.articleId = articleSave.getArticleId();
    dto.createdAt = articleSave.getCreatedAt().toISOString();
    return dto;
  }
}
