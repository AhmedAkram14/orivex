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
 * The most specific existing destination for a notification, for either
 * role. An appointment reference deep-links to that appointment's row on the
 * role's own Appointments page (the server `actionUrl` says which role it is
 * for -- `/patient/appointments`, or the doctor's `/doctor/queue` /
 * `/doctor/appointments`; the Queue only lists today, so a row link is
 * strictly more useful). Everything else keeps the server-provided
 * `actionUrl` (e.g. the completed consultation's summary link), and a
 * notification with neither has none.
 */
export function resolveNotificationHref(notification: NotificationEntry): string | undefined {
  const { entityType, entityId, actionUrl } = notification;
  if (entityType === 'appointment' && entityId && actionUrl) {
    if (actionUrl.startsWith('/patient/appointments')) return `/patient/appointments?highlight=${entityId}`;
    if (actionUrl.startsWith('/doctor/queue') || actionUrl.startsWith('/doctor/appointments')) {
      return `/doctor/appointments?highlight=${entityId}`;
    }
  }
  return actionUrl;
}
