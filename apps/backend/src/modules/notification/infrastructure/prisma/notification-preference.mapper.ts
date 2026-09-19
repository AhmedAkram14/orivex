import type { NotificationPreference as PrismaNotificationPreferenceRow } from '@prisma/client';

import { NotificationPreference } from '../../domain/entities/notification-preference.entity.js';

export function toDomainNotificationPreference(row: PrismaNotificationPreferenceRow): NotificationPreference {
  return NotificationPreference.reconstitute({
    id: row.id,
    accountId: row.accountId,
    emailAppointments: row.emailAppointments,
    emailBilling: row.emailBilling,
    inAppAppointments: row.inAppAppointments,
    inAppBilling: row.inAppBilling,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function toPersistedNotificationPreference(preference: NotificationPreference) {
  return {
    id: preference.getId(),
    accountId: preference.getAccountId(),
    emailAppointments: preference.getEmailAppointments(),
    emailBilling: preference.getEmailBilling(),
    inAppAppointments: preference.getInAppAppointments(),
    inAppBilling: preference.getInAppBilling(),
    createdAt: preference.getCreatedAt(),
    updatedAt: preference.getUpdatedAt(),
  };
}
