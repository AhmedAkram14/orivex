'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { useRouter } from '@/shared/i18n/navigation';
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
 */
export function RequireAuth({ children, redirectTo }: RequireAuthProps) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(redirectTo);
    }
  }, [status, redirectTo, router]);

  if (status !== 'authenticated') {
    return <LoadingState label="Checking your session" />;
  }

  return children;
}
