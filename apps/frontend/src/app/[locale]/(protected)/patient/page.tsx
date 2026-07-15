'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ActivePrescriptionsWidget } from '@/features/patient/components/active-prescriptions-widget';
import { HealthSummary } from '@/features/patient/components/health-summary';
import { PatientQuickActions } from '@/features/patient/components/patient-quick-actions';
import { UpcomingAppointmentsWidget } from '@/features/patient/components/upcoming-appointments-widget';
import { WelcomeHeader } from '@/features/patient/components/welcome-header';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Patient Portal's dashboard — the patient-specific landing page,
 * distinct from the shared `/dashboard` (every role) and reachable only by
 * the `patient` role (`RequireRole`). Composes `WelcomeHeader` +
 * `HealthSummary` + `UpcomingAppointmentsWidget` + `ActivePrescriptionsWidget`
 * + `PatientQuickActions`, all backed by real (mocked) queries, all
 * honestly empty/zero since no Scheduling/Clinical module exists in the
 * frontend yet — this phase builds the Patient Portal architecture those
 * modules will render inside, not the modules themselves. Mirrors the
 * Doctor Workspace dashboard exactly.
 */
export default function PatientDashboardPage() {
  const t = useTranslations('patient.dashboard');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />
        <WelcomeHeader />
        <HealthSummary />
        <UpcomingAppointmentsWidget />
        <ActivePrescriptionsWidget />
        <PatientQuickActions />
      </Page>
    </RequireRole>
  );
}
