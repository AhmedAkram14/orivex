export interface SubmitArticleForReviewProps {
  articleId: string;
  callerAccountId: string;
}

export class SubmitArticleForReviewCommand {
  readonly articleId: string;
  readonly callerAccountId: string;

  constructor(props: SubmitArticleForReviewProps) {
    this.articleId = props.articleId;
    this.callerAccountId = props.callerAccountId;
  }
}
