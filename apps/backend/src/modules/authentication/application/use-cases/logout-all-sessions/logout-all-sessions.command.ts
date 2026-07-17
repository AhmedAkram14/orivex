export class LogoutAllSessionsCommand {
  readonly accountId: string;

  constructor(props: { accountId: string }) {
    this.accountId = props.accountId;
  }
}
