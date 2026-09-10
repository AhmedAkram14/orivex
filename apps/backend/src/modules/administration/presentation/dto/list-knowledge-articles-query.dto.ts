import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { KnowledgeArticleStatus } from '../../../knowledge/domain/enums/knowledge-article-status.enum.js';

// I13 -- Knowledge Center: omitted status defaults to PendingReview in the
// controller (the actual moderation queue an admin needs to act on).
export class ListKnowledgeArticlesQueryDto {
  @IsOptional()
  @IsEnum(KnowledgeArticleStatus)
  status?: KnowledgeArticleStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
