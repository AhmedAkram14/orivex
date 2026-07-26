'use client';

import { CalendarDays, FileText, Layers, Pill, Search, Stethoscope, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QuickActions } from '@/shared/ui/layout/quick-actions';

/** The Patient Portal dashboard's shortcut grid — reuses the shared `QuickActions`/`QuickActionCard` primitives (Phase 6), pointed at this phase's own routes. Every entry links to a route this same phase builds (profile: milestone 2, appointments: milestone 3, records: milestone 4, prescriptions: milestone 5) — never a disabled placeholder. `becomeADoctor` is Doctor Onboarding's real entry point (Phase 4 continuation), reachable by every patient account. `browseDoctors`/`browseSpecialties` are Onboarding Redesign (2026-07-21 proposal, Stage O.5) additions -- immediately reachable, no identity-verification gate. */
export function PatientQuickActions() {
  const t = useTranslations('patient.dashboard.quickActions');

  return (
    <QuickActions
      actions={[
        { id: 'profile', label: t('viewProfile'), icon: User, href: '/patient/profile' },
        { id: 'appointments', label: t('viewAppointments'), icon: CalendarDays, href: '/patient/appointments' },
        { id: 'browse-doctors', label: t('browseDoctors'), icon: Search, href: '/patient/doctors' },
        { id: 'browse-specialties', label: t('browseSpecialties'), icon: Layers, href: '/patient/specialties' },
        { id: 'records', label: t('viewRecords'), icon: FileText, href: '/patient/records' },
        { id: 'prescriptions', label: t('viewPrescriptions'), icon: Pill, href: '/patient/prescriptions' },
        { id: 'become-a-doctor', label: t('becomeADoctor'), icon: Stethoscope, href: '/doctor/onboarding' },
      ]}
    />
  );
}
