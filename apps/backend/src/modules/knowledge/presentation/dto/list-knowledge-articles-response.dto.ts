import type { KnowledgeArticle } from '../../domain/entities/knowledge-article.entity.js';

import { KnowledgeArticleResponseDto } from './knowledge-article-response.dto.js';

// Mirrors ListAdminPaymentTransactionsResponseDto's own {items, total, page, limit} shape.
export class ListKnowledgeArticlesResponseDto {
  articles!: KnowledgeArticleResponseDto[];
  total!: number;
  page!: number;
  limit!: number;

  static fromResult(result: { articles: KnowledgeArticle[]; total: number }, page: number, limit: number): ListKnowledgeArticlesResponseDto {
    const dto = new ListKnowledgeArticlesResponseDto();
    dto.articles = result.articles.map((article) => KnowledgeArticleResponseDto.fromDomain(article));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
