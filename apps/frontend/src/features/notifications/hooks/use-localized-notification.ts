'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useContext } from 'react';
import type { NotificationEntry } from '@/features/notifications/api/types';
import { localizeNotification } from '@/features/notifications/lib/notification-copy';
import { AuthContext } from '@/shared/auth/auth-context';

/** Returns a function that renders a notification's title/body in the active locale, worded for its audience. */
export function useLocalizedNotification() {
  const t = useTranslations('notificationCopy');
  const format = useFormatter();
  return useCallback((entry: NotificationEntry) => localizeNotification(entry, t, format), [t, format]);
}

/** True when the signed-in account practises as a doctor (and may also book as a patient). */
export function useViewerIsDoctor(): boolean {
  // Read the context directly (null outside a SessionProvider, e.g. isolated component renders) instead of the throwing `useAuth`.
  const auth = useContext(AuthContext);
  return auth?.user?.roles.includes('doctor') ?? false;
}
