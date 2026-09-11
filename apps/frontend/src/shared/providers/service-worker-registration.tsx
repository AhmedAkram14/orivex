'use client';

import { useEffect } from 'react';
import { env } from '@/shared/lib/env';

/**
 * Registers the PWA offline-shell service worker (public/sw.js, N6 in the
 * remaining-work checklist). Only when NEXT_PUBLIC_ENABLE_API_MOCKS is
 * false: MSW's own worker (mockServiceWorker.js, see mock-provider.tsx)
 * registers at the same '/' scope in mock/E2E mode, and a browser only
 * lets one service worker control a scope at a time -- registering both
 * would make the last one to win silently replace the other. Real/
 * production mode is also the only mode where "offline shell" is a
 * meaningful thing to offer.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (env.enableApiMocks) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('[ServiceWorkerRegistration] Failed to register the offline-shell service worker.', error);
    });
  }, []);

  return null;
}
