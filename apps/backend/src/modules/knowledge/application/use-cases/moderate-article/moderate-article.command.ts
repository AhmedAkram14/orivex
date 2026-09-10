import type { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';

export interface ModerateArticleProps {
  articleId: string;
  status: KnowledgeArticleStatus.Published | KnowledgeArticleStatus.Rejected | KnowledgeArticleStatus.Archived;
  reason: string;
  moderatorAccountId: string;
}

export class ModerateArticleCommand {
  readonly articleId: string;
  readonly status: KnowledgeArticleStatus.Published | KnowledgeArticleStatus.Rejected | KnowledgeArticleStatus.Archived;
  readonly reason: string;
  readonly moderatorAccountId: string;

  constructor(props: ModerateArticleProps) {
    this.articleId = props.articleId;
    this.status = props.status;
    this.reason = props.reason;
    this.moderatorAccountId = props.moderatorAccountId;
  }
}
