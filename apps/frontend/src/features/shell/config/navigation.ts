import {
  CalendarDays,
  CalendarRange,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Receipt,
  ShieldAlert,
  Stethoscope,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/shared/auth/permissions';
import type { Role } from '@/shared/auth/types';

export interface NavItemConfig {
  id: string;
  /** Key into the `shell.nav` message namespace — never a hardcoded label. */
  labelKey: string;
  icon: LucideIcon;
  /** Omitted for a group node (one with `children`), which has no destination of its own. */
  href?: string;
  /** Visible to every authenticated role when omitted. */
  roles?: Role[];
  /** Additionally gated by a specific capability, on top of any `roles` restriction. */
  permission?: Permission;
  /**
   * Gated behind `useFeatureFlag(featureFlag)`, which currently always
   * resolves to its default (false) — see `shared/lib/feature-flags.ts`.
   * These entries exist so the config already models where Patients/
   * Appointments/Prescriptions/Billing/Admin will hang once those phases
   * ship, without rendering a dead link today: they simply don't appear
   * until their flag is flipped on.
   */
  featureFlag?: string;
  children?: NavItemConfig[];
}

/**
 * The single source of truth for sidebar/mobile-nav content — no page or
 * component hardcodes a nav item. `SidebarNav`/`MobileNav` render whatever
 * `filterNavigationByAccess` (lib/filter-navigation.ts) returns from this
 * list for the current session, in this order.
 */
export const NAVIGATION_CONFIG: NavItemConfig[] = [
  {
    id: 'dashboard',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'doctor-workspace',
    labelKey: 'doctorWorkspace',
    icon: Stethoscope,
    roles: ['doctor'],
    children: [
      {
        id: 'doctor-workspace-dashboard',
        labelKey: 'overview',
        icon: Stethoscope,
        href: '/doctor',
        roles: ['doctor'],
      },
      {
        id: 'doctor-workspace-profile',
        labelKey: 'doctorProfile',
        icon: User,
        href: '/doctor/profile',
        roles: ['doctor'],
      },
      {
        id: 'doctor-workspace-schedule',
        labelKey: 'doctorSchedule',
        icon: CalendarRange,
        href: '/doctor/schedule',
        roles: ['doctor'],
      },
    ],
  },
  {
    id: 'clinical',
    labelKey: 'groups.clinical',
    icon: HeartPulse,
    children: [
      {
        id: 'patients',
        labelKey: 'patients',
        icon: Users,
        href: '/patients',
        permission: 'patients:read',
        featureFlag: 'nav.patients',
      },
      {
        id: 'appointments',
        labelKey: 'appointments',
        icon: CalendarDays,
        href: '/appointments',
        permission: 'appointments:read',
        featureFlag: 'nav.appointments',
      },
      {
        id: 'prescriptions',
        labelKey: 'prescriptions',
        icon: Pill,
        href: '/prescriptions',
        permission: 'prescriptions:read',
        featureFlag: 'nav.prescriptions',
      },
    ],
  },
  {
    id: 'administration',
    labelKey: 'groups.administration',
    icon: UserCog,
    children: [
      {
        id: 'billing',
        labelKey: 'billing',
        icon: Receipt,
        href: '/billing',
        permission: 'billing:read',
        featureFlag: 'nav.billing',
      },
      {
        id: 'users',
        labelKey: 'users',
        icon: UserCog,
        href: '/admin/users',
        permission: 'admin:manage-users',
        featureFlag: 'nav.adminUsers',
      },
    ],
  },
  {
    id: 'security',
    labelKey: 'security',
    icon: ShieldAlert,
    href: '/security',
  },
];
