// Infra binds to an argon2id adapter (infrastructure/crypto/argon2-password-
// hasher.ts). Application/domain layers never see the hashing algorithm.
export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
