import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

import { KnowledgeArticleStatus } from '../../../knowledge/domain/enums/knowledge-article-status.enum.js';

export class ModerateKnowledgeArticleRequestDto {
  // Deliberately excludes PendingReview -- an admin approves, rejects, or
  // archives, never sets an article back to pending themselves.
  @IsIn([KnowledgeArticleStatus.Published, KnowledgeArticleStatus.Rejected, KnowledgeArticleStatus.Archived])
  status!: KnowledgeArticleStatus.Published | KnowledgeArticleStatus.Rejected | KnowledgeArticleStatus.Archived;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}
