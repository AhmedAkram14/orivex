'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { AppLoadingScreen } from '@/shared/ui/app-loading-screen';

/**
 * Where the backend lands a successful Social Sign-In (docs/14-adrs.md
 * ADR-008). By now the httpOnly refresh cookie is set; the normal session
 * bootstrap turns it into a session, and the guest layout then sends the
 * visitor on to `?returnTo=` or /dashboard -- this page only has to wait.
 * If the bootstrap still ends up signed out (the browser refused the
 * cookie), `failure` is shown instead of spinning forever.
 */
export function OAuthCallbackPending({ failure }: { failure: ReactNode }) {
  const t = useTranslations('auth.oauthCallback');
  const { status } = useAuth();

  if (status === 'unauthenticated') return failure;

  return <AppLoadingScreen message={t('signingIn')} />;
}
