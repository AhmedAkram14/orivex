import type { SecurityEvent } from '../entities/security-event.entity.js';

// Append-only: no update/delete exposed, matching SecurityEvent's own
// audit-trail nature (docs/10-backend-architecture.md's TrustModule entry).
export interface SecurityEventRepository {
  record(event: SecurityEvent): Promise<void>;
}
