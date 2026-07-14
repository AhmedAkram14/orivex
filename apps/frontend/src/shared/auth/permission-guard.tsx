'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { hasPermission, type Permission } from '@/shared/auth/permissions';

export interface PermissionGuardProps {
  children: ReactNode;
  permission: Permission;
  fallback?: ReactNode;
}

/**
 * Finer-grained than RoleGuard — checks a specific capability rather than
 * a named role, so a page that only cares "can this user write clinical
 * notes" doesn't need to know or enumerate which roles happen to grant
 * that today. Same "UX convenience, not a security boundary" rule as
 * every other guard in this file.
 */
export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const { user } = useAuth();
  const allowed = user ? hasPermission(user.roles, permission) : false;
  return allowed ? children : fallback;
}
