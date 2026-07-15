import type { AuthToken } from '../entities/auth-token.entity.js';
import type { TokenPurpose } from '../enums/token-purpose.enum.js';
import type { TokenHash } from '../value-objects/token-hash.value-object.js';

export interface AuthTokenRepository {
  findActiveByHash(hash: TokenHash, purpose: TokenPurpose): Promise<AuthToken | null>;
  save(token: AuthToken): Promise<void>;
}
