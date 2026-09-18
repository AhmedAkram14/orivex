import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { KnowledgeArticleLanguage } from '../../domain/enums/knowledge-article-language.enum.js';

export class ListArticlesQueryDto {
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  // Knowledge Center Hardening Phase 1, decision 5: lets the patient feed
  // filter to the viewer's own preferred language (with a toggle to see
  // all, by simply omitting this param).
  @IsOptional()
  @IsEnum(KnowledgeArticleLanguage)
  language?: KnowledgeArticleLanguage;

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
  limit?: number = 20;
}
