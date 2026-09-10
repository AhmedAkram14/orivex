export interface UnsaveArticleProps {
  callerAccountId: string;
  articleId: string;
}

export class UnsaveArticleCommand {
  readonly callerAccountId: string;
  readonly articleId: string;

  constructor(props: UnsaveArticleProps) {
    this.callerAccountId = props.callerAccountId;
    this.articleId = props.articleId;
  }
}
