// Generates opaque, cryptographically random tokens (refresh tokens, email-
// verification/password-reset tokens) and hashes them for at-rest storage.
// Infra binds to a node:crypto adapter (infrastructure/crypto/node-token-
// generator.ts).
export interface TokenGeneratorPort {
  generate(): string;
  hash(plain: string): string;
}
