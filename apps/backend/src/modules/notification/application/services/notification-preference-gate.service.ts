import { NotificationChannel } from '../../domain/enums/notification-channel.enum.js';
import type { NotificationCategory } from '../../domain/enums/notification-category.enum.js';
import type { NotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository.js';

// Doctor Settings Rebuild (Phase 3): email is a separate delivery path from
// `NotificationRepository.save()` -- a handful of handlers call
// `emailSender.send(...)` directly, so they can't be gated by
// PreferenceGatedNotificationRepository. This is the equivalent guard for
// that path: inject it into just those handlers and wrap their existing
// `emailSender.send(...)` call in `if (await gate.isEmailEnabled(...))`.
export class NotificationPreferenceGate {
  constructor(private readonly preferenceRepository: NotificationPreferenceRepository) {}

  async isEmailEnabled(accountId: string, category: NotificationCategory): Promise<boolean> {
    const preference = await this.preferenceRepository.findByAccountId(accountId);
    // No row yet means "everything on" (NotificationPreference.create()'s
    // own all-true defaults) -- the same lazy-default convention
    // GetNotificationPreferencesUseCase already establishes.
    if (!preference) {
      return true;
    }
    return preference.isChannelEnabled(category, NotificationChannel.Email);
  }
}
