// Matches ConsentRecord's Prisma enum exactly (docs/10-backend-
// architecture.md's TrustModule entry: "Commands accepted: ..., GrantConsent,
// RevokeConsent"). Only two states -- there is no "pending" consent in this
// model; a relationship either has an explicit revoke on file or it doesn't
// (see ConsentRecord's own comment on the default-granted rule).
export enum ConsentState {
  Granted = 'granted',
  Revoked = 'revoked',
}
