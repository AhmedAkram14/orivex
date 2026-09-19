import { NotificationChannel } from '../../domain/enums/notification-channel.enum.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';
import type { NotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository.js';

// Doctor Settings Rebuild (Phase 3): the fan-out gate. Decorates the real
// repository -- wired INNERMOST in the chain
// RealtimeNotifyingNotificationRepository already establishes (see
// notification.module.ts), so a suppressed notification never reaches the
// realtime push either (nothing to push if it was never saved). Every one
// of this module's ~20 event handlers keeps calling
// `notificationRepository.save(notification)` exactly as today -- zero
// logic changes there beyond tagging `category:` on Notification.create().
//
// Only `save()` is gated; every read method delegates straight to `inner`
// (mirrors RealtimeNotifyingNotificationRepository's own read pass-through
// shape).
export class PreferenceGatedNotificationRepository implements NotificationRepository {
  constructor(
    private readonly inner: NotificationRepository,
    private readonly preferenceRepository: NotificationPreferenceRepository,
  ) {}

  findById(id: string): Promise<Notification | null> {
    return this.inner.findById(id);
  }

  findByAccountId(accountId: string): Promise<Notification[]> {
    return this.inner.findByAccountId(accountId);
  }

  findByAccountIdPage(accountId: string, skip: number, take: number): Promise<Notification[]> {
    return this.inner.findByAccountIdPage(accountId, skip, take);
  }

  countByAccountId(accountId: string): Promise<number> {
    return this.inner.countByAccountId(accountId);
  }

  async save(notification: Notification): Promise<void> {
    const category = notification.getCategory();
    if (category) {
      const preference = await this.preferenceRepository.findByAccountId(notification.getAccountId());
      // No row yet means "everything on" (NotificationPreference.create()'s
      // own all-true defaults) -- only an EXISTING row with the in-app
      // channel explicitly disabled for this category suppresses the save.
      if (preference && !preference.isChannelEnabled(category, NotificationChannel.InApp)) {
        return;
      }
    }

    await this.inner.save(notification);
  }
}
