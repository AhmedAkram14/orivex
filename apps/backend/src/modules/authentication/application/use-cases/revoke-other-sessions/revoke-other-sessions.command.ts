export class RevokeOtherSessionsCommand {
  readonly accountId: string;
  // Raw (plaintext) refresh-token cookie value for the calling request --
  // identifies which active session is "this device" so it's excluded from
  // the bulk revoke.
  readonly currentRefreshToken?: string;

  constructor(props: { accountId: string; currentRefreshToken?: string }) {
    this.accountId = props.accountId;
    this.currentRefreshToken = props.currentRefreshToken;
  }
}
