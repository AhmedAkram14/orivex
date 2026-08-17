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
    // Notification Center pagination fix -- more than one page's worth
    // (PAGE_SIZE 5 on the new page) of realistic entries, so pagination is
    // meaningfully testable instead of always fitting on page 1.
    {
      id: 'notification-4',
      title: 'Appointment confirmed',
      description: 'Your appointment with Dr. Amina Hassan was confirmed for tomorrow at 10:00 AM.',
      severity: 'success',
      createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
      read: true,
    },
    {
      id: 'notification-5',
      title: 'Payment received',
      description: 'Your payment of 500 EGP was processed successfully.',
      severity: 'success',
      createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      read: true,
    },
    {
      id: 'notification-6',
      title: 'Verification under review',
      description: 'Your professional verification application is being reviewed.',
      severity: 'info',
      createdAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
      read: true,
    },
    {
      id: 'notification-7',
      title: 'Reminder: upcoming appointment',
      description: 'You have an appointment with Dr. Karim Mostafa in 2 hours.',
      severity: 'warning',
      createdAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
      read: true,
    },
    {
      id: 'notification-8',
      title: 'Appointment cancelled',
      description: 'Your appointment with Dr. Nadia Fathy was cancelled by the doctor.',
      severity: 'danger',
      createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
      read: true,
    },
    {
      id: 'notification-9',
      title: 'Prescription ready',
      description: 'A new prescription was issued and is ready to view.',
      severity: 'info',
      createdAt: new Date(Date.now() - 11 * 86_400_000).toISOString(),
      read: true,
    },
    {
      id: 'notification-10',
      title: 'Profile verified',
      description: 'Your identity verification was approved.',
      severity: 'success',
      createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
      read: true,
    },
    {
      id: 'notification-11',
      title: 'Refund issued',
      description: 'A refund of 300 EGP was issued to your original payment method.',
      severity: 'info',
      createdAt: new Date(Date.now() - 13 * 86_400_000).toISOString(),
      read: true,
    },
    {
      id: 'notification-12',
      title: 'Security alert',
      description: 'We noticed a login attempt from an unrecognized location.',
      severity: 'danger',
      createdAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      read: true,
    },
  ];
}

/**
 * Demo Data & Profile Avatar Pass: notifications used to be one global list
 * every account shared -- so a doctor and a patient logged into the same
 * demo saw literally the same inbox. Now keyed by account id, consistent
 * with `doctor-store.ts`/`patient-store.ts`'s own account-keying fix. An
 * account with nothing seeded reads the original fixture list above, which
 * is what keeps the existing Notification Center tests unchanged.
 */
const notificationsByAccountId = new Map<string, NotificationEntry[]>();
const LEGACY_ACCOUNT_KEY = '__legacy__';

function listFor(accountId: string | undefined): NotificationEntry[] {
  const key = accountId ?? LEGACY_ACCOUNT_KEY;
  const existing = notificationsByAccountId.get(key);
  if (existing) return existing;
  const seeded = seedNotifications();
  notificationsByAccountId.set(key, seeded);
  return seeded;
}

/** Demo Data & Profile Avatar Pass: the demo seeder's write path -- realistic, role-appropriate, per-account inboxes. */
export function setNotificationsForAccount(accountId: string, entries: NotificationEntry[]): void {
  notificationsByAccountId.set(accountId, entries);
}

/** Test-only: restores the seed data, since `markNotificationAsRead`/`markAllNotificationsAsRead` mutate this module's shared state across every test in a file. Never called from application code. */
export function resetNotifications(): void {
  notificationsByAccountId.clear();
}

export function getNotifications(accountId?: string): NotificationEntry[] {
  return [...listFor(accountId)].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Real offset pagination over the sorted list (Notification Center pagination fix) — mirrors `listAllTransactionsForAdmin`'s page/limit slicing. */
export function getNotificationsPage(page: number, limit: number, accountId?: string): { items: NotificationEntry[]; total: number } {
  const sorted = getNotifications(accountId);
  const offset = (page - 1) * limit;
  return { items: sorted.slice(offset, offset + limit), total: sorted.length };
}

export function markNotificationAsRead(id: string, accountId?: string): void {
  const notification = listFor(accountId).find((entry) => entry.id === id);
  if (notification) notification.read = true;
}

export function markAllNotificationsAsRead(accountId?: string): void {
  for (const notification of listFor(accountId)) notification.read = true;
}
