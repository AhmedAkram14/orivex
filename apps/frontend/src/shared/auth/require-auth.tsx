'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/shared/auth/auth-provider';
import { LoadingState } from '@/shared/ui/loading-state';

export interface RequireAuthProps {
  children: ReactNode;
  /** Where to send an unauthenticated visitor. No default: Phase 4 hasn't built a login route yet, so callers must be explicit rather than this component assuming a path that may 404. */
  redirectTo: string;
}

/**
 * A UX convenience, not a security boundary (Phase 5's own binding rule —
 * see docs/roadmaps/frontend-master-plan.md). The backend must
 * independently enforce every permission this component merely reflects;
 * hiding a page client-side never substitutes for that. Today, with no
 * real auth wired, every visitor is genuinely unauthenticated, so this
 * component's current behavior (redirect everyone) is honest — it stops
 * being a no-op only once AuthProvider starts producing real sessions.
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
