'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/features/auth/api/auth-api';
import type { OAuthProvider } from '@/features/auth/api/types';
import { oauthProviderKeys } from '@/features/auth/hooks/query-keys';
import { safeReturnTo } from '@/shared/auth/return-to';

/**
 * Social Sign-In (docs/14-adrs.md ADR-008): which providers this deployment
 * offers, and the URL each button navigates the whole page to. The current
 * locale and a safe `?returnTo=` ride along, so the backend can send the
 * visitor back to the same language and the same deep link afterwards.
 *
 * A failed providers lookup simply hides the buttons -- password sign-in
 * keeps working, and the buttons must never block it.
 */
export function useOAuthSignIn() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));

  const query = useQuery({
    queryKey: oauthProviderKeys.detail('configured'),
    queryFn: () => authApi.getOAuthProviders(),
    staleTime: 10 * 60_000,
    retry: false,
  });

  return {
    providers: query.data?.providers ?? [],
    startUrl: (provider: OAuthProvider) => authApi.oauthStartUrl(provider, { locale, returnTo }),
  };
}
