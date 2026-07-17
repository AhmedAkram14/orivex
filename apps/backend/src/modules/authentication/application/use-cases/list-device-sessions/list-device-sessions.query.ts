export interface ListDeviceSessionsQuery {
  accountId: string;
  // Raw (plaintext) refresh-token cookie value for the calling request, if
  // any -- hashed internally to flag which returned session is the caller's
  // current one, the same way RefreshSessionUseCase hashes a presented
  // token before comparing it.
  currentRefreshToken?: string;
}
