'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DashboardHero } from '@/features/doctor/components/dashboard-hero';
import { PatientQueueMini } from '@/features/doctor/components/patient-queue-mini';
import { RecentActivity } from '@/features/doctor/components/recent-activity';
import { TodaysProgress } from '@/features/doctor/components/todays-progress';
import { TodaysSchedule } from '@/features/doctor/components/todays-schedule';
import { TodaysSummary } from '@/features/doctor/components/todays-summary';
import { UpcomingAvailability } from '@/features/doctor/components/upcoming-availability';
import { RequireRole } from '@/shared/auth/require-role';
import { DashboardGrid, Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Workspace's dashboard — the doctor-specific landing page,
 * distinct from the shared `/dashboard` (every role) and reachable only by
 * the `doctor` role (`RequireRole`). Premium-dashboard redesign: hero
 * (greeting + real today/next-patient facts + Quick Actions + gender-based
 * illustration) → 4-stat row (`TodaysSummary`, now including the doctor's
 * real rating) → Today's Schedule / Patient Queue mini two-column → Today's
 * Progress / Upcoming Availability / Recent Activity three-widget row.
 * Every widget composes an existing real hook/query -- reused, not thrown
 * away, per this redesign's own "no fabrication" mandate: no trend arrows,
 * no invented figures, only honest empty/zero states where real data is
 * genuinely absent.
 */
export default function DoctorDashboardPage() {
  const t = useTranslations('doctor.dashboard');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page className="gap-8 lg:px-10">
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />
        <DashboardHero />
        <TodaysSummary />

        <DashboardGrid columns={2} className="gap-6">
          <TodaysSchedule />
          <PatientQueueMini />
        </DashboardGrid>

        <DashboardGrid columns={3} className="gap-6">
          <TodaysProgress />
          <UpcomingAvailability />
          <RecentActivity />
        </DashboardGrid>
      </Page>
    </RequireRole>
  );
}
