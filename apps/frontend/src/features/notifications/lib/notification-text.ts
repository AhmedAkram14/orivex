import type { useFormatter } from 'next-intl';
import type { NotificationEntry } from '@/features/notifications/api/types';

type Formatter = ReturnType<typeof useFormatter>;

const ISO_TIMESTAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g;

/**
 * Some server-composed notification bodies embed a raw ISO timestamp
 * ("scheduled for 2026-09-12T16:00:00.000Z"). The backend composes these as
 * plain English strings without a structured datetime field, so until it
 * grows one (see IMPLEMENTATION_NOTES.md, patient Overview proposals), the
 * client localizes any ISO timestamp it finds into the user's own
 * date/time format rather than showing the machine string.
 */
export function localizeIsoTimestamps(text: string, format: Formatter): string {
  return text.replace(ISO_TIMESTAMP, (match) => {
    const date = new Date(match);
    return Number.isNaN(date.getTime()) ? match : format.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' });
  });
}

/**
 * The most specific existing patient-side destination for a notification.
 * An appointment reference deep-links to that appointment's row; everything
 * else keeps the server-provided `actionUrl` (e.g. the completed
 * consultation's summary link), and a notification with neither has none.
 */
export function resolvePatientNotificationHref(notification: NotificationEntry): string | undefined {
  if (notification.entityType === 'appointment' && notification.entityId) {
    return `/patient/appointments?highlight=${notification.entityId}`;
  }
  return notification.actionUrl;
}
