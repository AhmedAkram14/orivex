import { IsString, MaxLength, MinLength } from 'class-validator';

// Knowledge Center Hardening Phase 1: mirrors
// ModerateKnowledgeArticleRequestDto's own reason validator style/max
// length exactly (administration module's admin-moderation DTO).
export class UnpublishArticleRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}
