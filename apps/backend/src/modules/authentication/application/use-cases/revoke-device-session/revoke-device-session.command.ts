export class RevokeDeviceSessionCommand {
  readonly accountId: string;
  readonly sessionId: string;
  // Raw (plaintext) refresh-token cookie value for the calling request, if
  // any -- used only to detect and reject an attempt to revoke the caller's
  // own current session through this route (use logout instead).
  readonly currentRefreshToken?: string;

  constructor(props: { accountId: string; sessionId: string; currentRefreshToken?: string }) {
    this.accountId = props.accountId;
    this.sessionId = props.sessionId;
    this.currentRefreshToken = props.currentRefreshToken;
  }
}
