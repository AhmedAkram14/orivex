import type { NotificationEntry } from '@/features/notifications/api/types';

/**
 * In-memory mock "backend" state for `/notifications/*` — mirrors
 * `auth-store.ts`'s pattern (module-level state + pure read/mutate
 * functions the handlers call into). `/notifications` is a real backend
 * endpoint (NotificationModule); this mock now exists purely to keep the
 * frontend test suite deterministic, matching `patient-store.ts`'s
 * `seedProfile()` precedent. No application code outside `src/mocks/` may
 * import this directly; go through `notificationsApi`.
 */
function seedNotifications(): NotificationEntry[] {
  return [
    {
      id: 'notification-1',
      title: 'Welcome to Orivex',
      description: 'Your account was created successfully.',
      severity: 'success',
      createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      read: false,
    },
    {
      id: 'notification-2',
      title: 'New device signed in',
      description: 'A new device signed in to your account. Review it in the Security Center if this wasn’t you.',
      severity: 'info',
      createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
      read: false,
    },
    {
      id: 'notification-3',
      title: 'Password changed',
      description: 'Your password was changed successfully.',
      severity: 'info',
      createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      read: true,
    },
  ];
}

let notifications: NotificationEntry[] = seedNotifications();

/** Test-only: restores the seed data, since `markNotificationAsRead`/`markAllNotificationsAsRead` mutate this module's shared state across every test in a file. Never called from application code. */
export function resetNotifications(): void {
  notifications = seedNotifications();
}

export function getNotifications(): NotificationEntry[] {
  return [...notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function markNotificationAsRead(id: string): void {
  const notification = notifications.find((entry) => entry.id === id);
  if (notification) notification.read = true;
}

export function markAllNotificationsAsRead(): void {
  for (const notification of notifications) notification.read = true;
}
