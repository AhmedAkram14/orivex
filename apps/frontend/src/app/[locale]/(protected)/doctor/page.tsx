'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { TodaysSummary } from '@/features/doctor/components/todays-summary';
import { UpcomingWorkArea } from '@/features/doctor/components/upcoming-work-area';
import { WelcomeHeader } from '@/features/doctor/components/welcome-header';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Workspace's dashboard — the doctor-specific landing page,
 * distinct from the shared `/dashboard` (every role) and reachable only
 * by the `doctor` role (`RequireRole`). Composes `WelcomeHeader` +
 * `TodaysSummary` + `UpcomingWorkArea`, all backed by real (mocked)
 * queries, all honestly empty/zero since no Appointment/Consultation
 * module exists in the frontend yet — this phase builds the workspace
 * architecture those modules will render inside, not the modules
 * themselves.
 */
export default function DoctorDashboardPage() {
  const t = useTranslations('doctor.dashboard');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />
        <WelcomeHeader />
        <TodaysSummary />
        <UpcomingWorkArea />
      </Page>
    </RequireRole>
  );
}
