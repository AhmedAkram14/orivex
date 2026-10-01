'use client';

import { DashboardHero } from '@/features/doctor/components/dashboard-hero';
import { PatientQueueMini } from '@/features/doctor/components/patient-queue-mini';
import { RecentActivity } from '@/features/doctor/components/recent-activity';
import { TodaysProgress } from '@/features/doctor/components/todays-progress';
import { TodaysSchedule } from '@/features/doctor/components/todays-schedule';
import { TodaysSummary } from '@/features/doctor/components/todays-summary';
import { UpcomingAvailability } from '@/features/doctor/components/upcoming-availability';
import { RequireRole } from '@/shared/auth/require-role';
import { DashboardGrid, DashboardGroup, Page } from '@/shared/ui/layout/page';

/**
 * The Doctor Workspace's dashboard -- reachable only by the `doctor` role.
 * One doctor HeroSurface (greeting h1 + today's timeline + quick actions),
 * one MetricStrip, then Today's Schedule / Patient Queue and Progress /
 * Availability / Recent Activity. Every widget composes an existing real hook;
 * no trend arrows, no invented figures, honest empty states.
 *
 * The widgets are one group: one `--card-gap` between them on both axes (and
 * `--group-gap` between the page's groups). The lists stop at three rows with
 * a link to the rest, so cards side by side end near the same line.
 */
export default function DoctorDashboardPage() {
  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <DashboardHero />
        <TodaysSummary />

        <DashboardGroup>
          <DashboardGrid columns={2}>
            <TodaysSchedule />
            <PatientQueueMini />
          </DashboardGrid>

          <DashboardGrid columns={3}>
            <TodaysProgress />
            <UpcomingAvailability />
            <RecentActivity />
          </DashboardGrid>
        </DashboardGroup>
      </Page>
    </RequireRole>
  );
}
