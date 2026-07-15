'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import type { Role } from '@/shared/auth/types';

export interface RoleGuardProps {
  children: ReactNode;
  roles: Role[];
  /** Rendered instead of children when the current user lacks every listed role. Defaults to nothing (not an error page — an unauthorized nav item should usually just not render, not show a wall of text). */
  fallback?: ReactNode;
}

/**
 * Role-gated rendering — same "UX convenience, not a security boundary"
 * rule as RequireAuth. This component cannot invent a role the backend
 * doesn't recognize (Phase 5's own constraint); `Role` in shared/auth/types
 * is the full set this frontend's RBAC design covers, not an
 * arbitrarily-invented per-page list. No page may hardcode a role check
 * inline — every role-based conditional goes through this component.
 */
export function RoleGuard({ children, roles, fallback = null }: RoleGuardProps) {
  const { user } = useAuth();
  const hasRole = user ? roles.some((role) => user.roles.includes(role)) : false;
  return hasRole ? children : fallback;
}
