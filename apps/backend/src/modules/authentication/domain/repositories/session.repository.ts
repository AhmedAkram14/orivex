import type { Session } from '../entities/session.entity.js';
import type { TokenHash } from '../value-objects/token-hash.value-object.js';

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByRefreshTokenHash(hash: TokenHash): Promise<Session | null>;
  findAllActiveForCredential(credentialId: string): Promise<Session[]>;
  save(session: Session): Promise<void>;
  // Bulk revoke for reuse-detection/password-reset/change-password flows —
  // a dedicated repository method rather than load-all-then-save-each-one,
  // since the whole point is a single atomic "kill every session" operation.
  revokeAllForCredential(credentialId: string): Promise<void>;
}
