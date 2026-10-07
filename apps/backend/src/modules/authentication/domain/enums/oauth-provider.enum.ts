// Social Sign-In providers (docs/14-adrs.md ADR-008). The string values are
// both the `ExternalIdentity.provider` column value and the `:provider` path
// segment of /auth/oauth/:provider/*.
export enum OAuthProvider {
  Google = 'google',
  Facebook = 'facebook',
}

export function parseOAuthProvider(value: string): OAuthProvider | null {
  return (Object.values(OAuthProvider) as string[]).includes(value) ? (value as OAuthProvider) : null;
}
