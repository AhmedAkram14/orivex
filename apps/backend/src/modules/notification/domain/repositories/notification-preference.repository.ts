import type { NotificationPreference } from '../entities/notification-preference.entity.js';

// Doctor Settings Rebuild (Phase 0): domain-only interface -- the Prisma
// implementation and its DI wiring land in Phase 2.
export interface NotificationPreferenceRepository {
  findByAccountId(accountId: string): Promise<NotificationPreference | null>;
  save(preference: NotificationPreference): Promise<void>;
}
