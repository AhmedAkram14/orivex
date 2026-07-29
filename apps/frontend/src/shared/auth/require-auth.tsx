'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { LoadingState } from '@/shared/ui/loading-state';

export interface RequireAuthProps {
  children: ReactNode;
  /** Where to send an unauthenticated visitor — a locale-relative path (e.g. '/login'), never pre-fixed with the locale segment yourself; the locale-aware router below adds it. */
  redirectTo: string;
}

/**
 * A UX convenience, not a security boundary (Phase 5's own binding rule —
 * see docs/roadmaps/frontend-master-plan.md). The backend must
 * independently enforce every permission this component merely reflects;
 * hiding a page client-side never substitutes for that.
 *
 * Public Landing Page (2026-07-29): carries the path the visitor actually
 * wanted (e.g. a specialty/doctor deep link from the landing page) through
 * to the redirect target as `?returnTo=`, so `/unauthorized` → `/login` can
 * send them back to it after signing in instead of always landing on
 * `/dashboard`.
 */
export function RequireAuth({ children, redirectTo }: RequireAuthProps) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const query = searchParams.toString();
      const returnTo = query ? `${pathname}?${query}` : pathname;
      router.replace(`${redirectTo}?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [status, redirectTo, router, pathname, searchParams]);

  if (status !== 'authenticated') {
    return <LoadingState label="Checking your session" />;
  }

  return children;
}
