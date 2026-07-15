// Claims are deliberately minimal: account id + role only, never email or
// PHI (docs/11-api-contracts.md's explicit JWT design rule). Infra binds to
// @nestjs/jwt (infrastructure/jwt/nestjs-jwt-signer.ts).
export interface AccessTokenClaims {
  accountId: string;
  role: string;
}

export interface SignedAccessToken {
  token: string;
  expiresAt: Date;
}

export interface JwtSignerPort {
  sign(claims: AccessTokenClaims): Promise<SignedAccessToken>;
  verify(token: string): Promise<AccessTokenClaims>;
}
