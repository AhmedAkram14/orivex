import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { KnowledgeArticleLanguage } from '../../domain/enums/knowledge-article-language.enum.js';

export class AuthorArticleRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;

  // Knowledge Center Hardening Phase 1, decision 5: required at
  // compose/submit time. The 10/200-character minimum-length floor lives
  // in the domain layer at submit time (KnowledgeArticle.submitForReview()),
  // not here -- a draft must pass this DTO's validation with minimal
  // content.
  @IsEnum(KnowledgeArticleLanguage)
  language!: KnowledgeArticleLanguage;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sourcesText?: string;

  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;
}
