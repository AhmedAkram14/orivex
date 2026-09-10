export interface SaveArticleProps {
  callerAccountId: string;
  articleId: string;
}

export class SaveArticleCommand {
  readonly callerAccountId: string;
  readonly articleId: string;

  constructor(props: SaveArticleProps) {
    this.callerAccountId = props.callerAccountId;
    this.articleId = props.articleId;
  }
}
