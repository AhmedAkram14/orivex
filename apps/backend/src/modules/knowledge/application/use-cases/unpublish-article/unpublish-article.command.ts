export interface UnpublishArticleProps {
  articleId: string;
  callerAccountId: string;
  reason: string;
}

export class UnpublishArticleCommand {
  readonly articleId: string;
  readonly callerAccountId: string;
  readonly reason: string;

  constructor(props: UnpublishArticleProps) {
    this.articleId = props.articleId;
    this.callerAccountId = props.callerAccountId;
    this.reason = props.reason;
  }
}
