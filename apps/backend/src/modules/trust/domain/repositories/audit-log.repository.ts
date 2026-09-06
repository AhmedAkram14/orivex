import type { AuditLog } from '../entities/audit-log.entity.js';

// Append-only: a single write method, matching AuditLog's own immutable
// nature. No read method yet -- an admin audit-log viewer (ORIVEX Remaining
// Work Audit item I11) is a separate, not-yet-built feature; this
// repository is scoped to exactly what C2 requires (the write path
// existing and being real), not to that future viewer.
export interface AuditLogRepository {
  record(entry: AuditLog): Promise<void>;
}
