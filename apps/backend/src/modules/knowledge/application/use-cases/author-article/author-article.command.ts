export interface AuthorArticleProps {
  callerAccountId: string;
  title: string;
  body: string;
}

export class AuthorArticleCommand {
  readonly callerAccountId: string;
  readonly title: string;
  readonly body: string;

  constructor(props: AuthorArticleProps) {
    this.callerAccountId = props.callerAccountId;
    this.title = props.title;
    this.body = props.body;
  }
}
