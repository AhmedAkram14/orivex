import { NotificationPreference } from '../../../domain/entities/notification-preference.entity.js';
import type { NotificationPreferenceRepository } from '../../../domain/repositories/notification-preference.repository.js';

import type { GetNotificationPreferencesQuery } from './get-notification-preferences.query.js';

// Pure read -- lazy-default (Doctor Settings Rebuild, Phase 2): no row
// existing for this account means "everything on", the same behavior every
// pre-existing account already gets today with no preference row at all.
// Returns an in-memory NotificationPreference.create({accountId}) WITHOUT
// persisting it -- a doctor who never touched their preferences shouldn't
// cause a database write just from viewing the settings page.
export class GetNotificationPreferencesUseCase {
  constructor(private readonly notificationPreferenceRepository: NotificationPreferenceRepository) {}

  async execute(query: GetNotificationPreferencesQuery): Promise<NotificationPreference> {
    const existing = await this.notificationPreferenceRepository.findByAccountId(query.accountId);
    return existing ?? NotificationPreference.create({ accountId: query.accountId });
  }
}
