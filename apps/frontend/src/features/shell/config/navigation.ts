import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardPlus,
  Contact,
  FileText,
  Flag,
  HeartPulse,
  LayoutDashboard,
  Layers,
  Pill,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
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
  /** Renders as inert (no navigation) for any role in this list -- for a real destination that just isn't the right link from that role's own view (e.g. a role with its own dedicated Overview page doesn't need a second, generic "Dashboard" link to the same idea). Never hides the item; `roles`/`permission`/`featureFlag` above are what control visibility. */
  disabledForRoles?: Role[];
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
    // The doctor role has its own real dashboard (Doctor Workspace's
    // Overview, /doctor) -- this generic link would just be a second,
    // redundant path to the same idea, so it's shown but inert for that
    // role rather than a real navigation choice.
    disabledForRoles: ['doctor'],
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
      {
        id: 'doctor-workspace-queue',
        labelKey: 'doctorQueue',
        icon: Users,
        href: '/doctor/queue',
        roles: ['doctor'],
      },
      {
        id: 'doctor-workspace-consultation',
        labelKey: 'doctorConsultation',
        icon: ClipboardPlus,
        href: '/doctor/consultation',
        roles: ['doctor'],
      },
      {
        id: 'doctor-workspace-patients',
        labelKey: 'doctorPatients',
        icon: Contact,
        href: '/doctor/patients',
        roles: ['doctor'],
      },
      {
        id: 'doctor-workspace-reports',
        labelKey: 'doctorReports',
        icon: BarChart3,
        href: '/doctor/reports',
        roles: ['doctor'],
      },
      {
        id: 'doctor-workspace-settings',
        labelKey: 'doctorSettings',
        icon: Settings,
        href: '/doctor/settings',
        roles: ['doctor'],
      },
    ],
  },
  {
    id: 'patient-workspace',
    labelKey: 'patientWorkspace',
    icon: HeartPulse,
    roles: ['patient'],
    children: [
      {
        id: 'patient-workspace-dashboard',
        labelKey: 'overview',
        icon: HeartPulse,
        href: '/patient',
        roles: ['patient'],
      },
      {
        id: 'patient-workspace-profile',
        labelKey: 'patientProfile',
        icon: User,
        href: '/patient/profile',
        roles: ['patient'],
      },
      {
        id: 'patient-workspace-appointments',
        labelKey: 'patientAppointments',
        icon: CalendarDays,
        href: '/patient/appointments',
        roles: ['patient'],
      },
      {
        // Onboarding Redesign (2026-07-21 proposal, Stage O.5) -- immediately
        // reachable, no identity-verification gate.
        id: 'patient-workspace-doctors',
        labelKey: 'patientDoctors',
        icon: Search,
        href: '/patient/doctors',
        roles: ['patient'],
      },
      {
        id: 'patient-workspace-specialties',
        labelKey: 'patientSpecialties',
        icon: Layers,
        href: '/patient/specialties',
        roles: ['patient'],
      },
      {
        id: 'patient-workspace-records',
        labelKey: 'patientRecords',
        icon: FileText,
        href: '/patient/records',
        roles: ['patient'],
      },
      {
        id: 'patient-workspace-prescriptions',
        labelKey: 'patientPrescriptions',
        icon: Pill,
        href: '/patient/prescriptions',
        roles: ['patient'],
      },
      {
        id: 'patient-workspace-health',
        labelKey: 'patientHealth',
        icon: HeartPulse,
        href: '/patient/health',
        roles: ['patient'],
      },
      {
        // Doctor Onboarding (Phase 4 continuation) -- reachable by a
        // Patient only: every account starts and stays Patient through
        // the entire Draft/Pending/Rejected onboarding lifecycle, so an
        // already-Doctor account has no reason to see this entry.
        id: 'patient-workspace-become-a-doctor',
        labelKey: 'becomeADoctor',
        icon: Stethoscope,
        href: '/doctor/onboarding',
        roles: ['patient'],
      },
    ],
  },
  {
    id: 'admin-workspace',
    labelKey: 'adminWorkspace',
    icon: UserCog,
    roles: ['super_admin'],
    children: [
      {
        id: 'admin-workspace-overview',
        labelKey: 'overview',
        icon: UserCog,
        href: '/admin',
        roles: ['super_admin'],
      },
      {
        id: 'admin-workspace-analytics',
        labelKey: 'adminAnalytics',
        icon: BarChart3,
        href: '/admin/analytics',
        roles: ['super_admin'],
      },
      {
        id: 'admin-workspace-hospitals',
        labelKey: 'adminHospitals',
        icon: Building2,
        href: '/admin/hospitals',
        roles: ['super_admin'],
      },
      {
        id: 'admin-workspace-verification-queue',
        labelKey: 'adminVerificationQueue',
        icon: ShieldCheck,
        href: '/admin/verification-queue',
        roles: ['super_admin'],
      },
      {
        id: 'admin-workspace-feature-flags',
        labelKey: 'adminFeatureFlags',
        icon: Flag,
        href: '/admin/feature-flags',
        roles: ['super_admin'],
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
