import { NotificationPreference } from '../../../domain/entities/notification-preference.entity.js';
import { NotificationCategory } from '../../../domain/enums/notification-category.enum.js';
import { NotificationChannel } from '../../../domain/enums/notification-channel.enum.js';
import type { NotificationPreferenceRepository } from '../../../domain/repositories/notification-preference.repository.js';

import type { UpdateNotificationPreferencesCommand } from './update-notification-preferences.command.js';

// Find-or-create (Doctor Settings Rebuild, Phase 2): unlike the lazy-default
// read side, a write always needs a real row to persist against, so this
// creates one via NotificationPreference.create({accountId}) (all-true
// defaults) when none exists yet, then applies only the fields the caller
// actually provided -- a partial PATCH must never clobber the other,
// unspecified channels.
export class UpdateNotificationPreferencesUseCase {
  constructor(private readonly notificationPreferenceRepository: NotificationPreferenceRepository) {}

  async execute(command: UpdateNotificationPreferencesCommand): Promise<NotificationPreference> {
    const preference =
      (await this.notificationPreferenceRepository.findByAccountId(command.accountId)) ??
      NotificationPreference.create({ accountId: command.accountId });

    if (command.emailAppointments !== undefined) {
      preference.updateChannel(NotificationCategory.Appointments, NotificationChannel.Email, command.emailAppointments);
    }
    if (command.emailBilling !== undefined) {
      preference.updateChannel(NotificationCategory.Billing, NotificationChannel.Email, command.emailBilling);
    }
    if (command.inAppAppointments !== undefined) {
      preference.updateChannel(NotificationCategory.Appointments, NotificationChannel.InApp, command.inAppAppointments);
    }
    if (command.inAppBilling !== undefined) {
      preference.updateChannel(NotificationCategory.Billing, NotificationChannel.InApp, command.inAppBilling);
    }

    await this.notificationPreferenceRepository.save(preference);
    return preference;
  }
}
