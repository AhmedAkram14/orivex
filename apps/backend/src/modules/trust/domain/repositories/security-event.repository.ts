import type { SecurityEvent } from '../entities/security-event.entity.js';

// Append-only: no update/delete exposed, matching SecurityEvent's own
// audit-trail nature (docs/10-backend-architecture.md's TrustModule entry).
// findByAccountId is the one read method (added for GET /auth/login-history),
// ordered by detectedAt descending (most recent first).
export interface SecurityEventRepository {
  record(event: SecurityEvent): Promise<void>;
  findByAccountId(accountId: string): Promise<SecurityEvent[]>;
}
