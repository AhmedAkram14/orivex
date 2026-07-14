import type { Role } from '@/shared/auth/types';

/**
 * Maps each role to its dashboard subtitle's message key (under
 * `shell.dashboard`) — the mechanism `DashboardPage` uses to render
 * role-appropriate copy from one shared page rather than six near-
 * duplicate role-specific page files, per this phase's "shared
 * architecture only, no duplicated layouts" rule. A user with multiple
 * roles gets the first match, in this map's declaration order (most
 * privileged role first).
 */
export const DASHBOARD_SUBTITLE_KEY: Record<Role, string> = {
  super_admin: 'subtitleSuperAdmin',
  hospital_admin: 'subtitleHospitalAdmin',
  doctor: 'subtitleDoctor',
  nurse: 'subtitleNurse',
  receptionist: 'subtitleReceptionist',
  patient: 'subtitlePatient',
};

const ROLE_PRIORITY: Role[] = ['super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist', 'patient'];

export function primaryRole(roles: Role[]): Role | undefined {
  return ROLE_PRIORITY.find((role) => roles.includes(role));
}
