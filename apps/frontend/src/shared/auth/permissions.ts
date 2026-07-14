import type { Role } from '@/shared/auth/types';

/**
 * A provisional permission set and role→permission map — the backend
 * enforces no real authorization yet (Phase 5 is 🔒 Blocked), so this
 * cannot be verified against a real source of truth. It is nonetheless
 * real, working logic for the roles this system already models, structured
 * as data specifically so extending it later (a new permission, a role
 * gaining one) is an edit to the map below, not a rewrite of
 * `PermissionGuard` or `hasPermission`'s logic.
 */
export type Permission =
  | 'patients:read'
  | 'patients:write'
  | 'appointments:read'
  | 'appointments:write'
  | 'prescriptions:read'
  | 'prescriptions:write'
  | 'clinical-notes:write'
  | 'billing:read'
  | 'admin:manage-users'
  | 'admin:manage-hospital';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    'patients:read',
    'patients:write',
    'appointments:read',
    'appointments:write',
    'prescriptions:read',
    'prescriptions:write',
    'clinical-notes:write',
    'billing:read',
    'admin:manage-users',
    'admin:manage-hospital',
  ],
  hospital_admin: ['patients:read', 'appointments:read', 'billing:read', 'admin:manage-users'],
  doctor: [
    'patients:read',
    'appointments:read',
    'appointments:write',
    'prescriptions:read',
    'prescriptions:write',
    'clinical-notes:write',
  ],
  receptionist: ['patients:read', 'appointments:read', 'appointments:write'],
  nurse: ['patients:read', 'clinical-notes:write'],
  patient: ['appointments:read'],
};

export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const permissions = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) permissions.add(permission);
  }
  return Array.from(permissions);
}

export function hasPermission(roles: Role[], permission: Permission): boolean {
  return getPermissionsForRoles(roles).includes(permission);
}
