'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import type { Role } from '@/shared/auth/types';
import { useRouter } from '@/shared/i18n/navigation';
import { LoadingState } from '@/shared/ui/loading-state';

export interface RequireRoleProps {
  children: ReactNode;
  roles: Role[];
  /** Where to send an authenticated visitor lacking every listed role — a locale-relative path (e.g. '/forbidden'), never pre-fixed with the locale segment yourself. */
  redirectTo: string;
}

/**
 * The route-level (redirecting) counterpart to `RoleGuard` (which only
 * conditionally renders in place) — for a whole page restricted to
 * specific roles, e.g. the Doctor Workspace. Renders inside `RequireAuth`
 * (assumes an authenticated session already), so it only has to check
 * roles, not auth status. Same binding rule as every other guard in this
 * codebase: a UX convenience, not a security boundary — the backend must
 * independently enforce every permission this merely reflects.
 */
export function RequireRole({ children, roles, redirectTo }: RequireRoleProps) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user ? user.roles.some((role) => roles.includes(role)) : false;

  useEffect(() => {
    if (user && !allowed) {
      router.replace(redirectTo);
    }
  }, [user, allowed, redirectTo, router]);

  if (!user || !allowed) {
    return <LoadingState label="Checking access" />;
  }

  return children;
}
