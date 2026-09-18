import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { KnowledgeArticleLanguage } from '../../domain/enums/knowledge-article-language.enum.js';

// Knowledge Center Hardening Phase 1: mirrors AuthorArticleRequestDto's
// title/body/language/sourcesText validators exactly -- an edit is
// content-equivalent to authoring, just missing saveAsDraft (an edit never
// changes which pipeline stage the article is in; the entity's own edit()
// decides that from the article's current status).
export class EditArticleRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;

  @IsEnum(KnowledgeArticleLanguage)
  language!: KnowledgeArticleLanguage;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sourcesText?: string;
}
