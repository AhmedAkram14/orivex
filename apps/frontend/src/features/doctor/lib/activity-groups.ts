import type { NotificationEntry } from '@/features/notifications/api/types';
import { notificationTypeKey } from '@/features/notifications/lib/notification-copy';

/** How close together repeats of one notification type must be to fold into a single Recent Activity row. */
export const ACTIVITY_GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** A notification's type for grouping: its known type key, or its exact title for a type the app doesn't know yet. */
function groupingType(entry: NotificationEntry): string {
  return notificationTypeKey(entry) ?? `title:${entry.title}`;
}

/**
 * Folds runs of the same notification type (newest first, as the API returns them) into one group
 * when every member is within 24 hours of the group's newest -- "3 consultations interrupted"
 * instead of three identical rows. Only consecutive repeats fold, so the feed's order is kept.
 */
export function groupConsecutiveActivity(entries: NotificationEntry[]): NotificationEntry[][] {
  const groups: NotificationEntry[][] = [];
  for (const entry of entries) {
    const current = groups.at(-1);
    const newest = current?.[0];
    if (
      current &&
      newest &&
      groupingType(newest) === groupingType(entry) &&
      Math.abs(new Date(newest.createdAt).getTime() - new Date(entry.createdAt).getTime()) <= ACTIVITY_GROUP_WINDOW_MS
    ) {
      current.push(entry);
    } else {
      groups.push([entry]);
    }
  }
  return groups;
}
