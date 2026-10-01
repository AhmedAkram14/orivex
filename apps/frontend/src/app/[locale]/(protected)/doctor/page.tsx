'use client';

import { DashboardHero } from '@/features/doctor/components/dashboard-hero';
import { PatientQueueMini } from '@/features/doctor/components/patient-queue-mini';
import { RecentActivity } from '@/features/doctor/components/recent-activity';
import { TodaysProgress } from '@/features/doctor/components/todays-progress';
import { TodaysSchedule } from '@/features/doctor/components/todays-schedule';
import { TodaysSummary } from '@/features/doctor/components/todays-summary';
import { UpcomingAvailability } from '@/features/doctor/components/upcoming-availability';
import { useHasBookingsToday } from '@/features/doctor/hooks/use-has-bookings-today';
import { RequireRole } from '@/shared/auth/require-role';
import { cn } from '@/shared/lib/cn';
import { DashboardGrid, DashboardGroup, Page } from '@/shared/ui/layout/page';

/**
 * The Doctor Workspace's dashboard -- reachable only by the `doctor` role.
 * One doctor HeroSurface (greeting h1 + today's timeline + quick actions),
 * one MetricStrip, then Today's Schedule / Patient Queue and Progress /
 * Availability / Recent Activity. Every widget composes an existing real hook;
 * no trend arrows, no invented figures, honest empty states.
 *
 * The widgets are one group: one `--card-gap` between them on both axes (and
 * `--group-gap` between the page's groups). Cards side by side share one
 * height (each row stretches to its tallest card; from two columns up), and
 * the lists stop at three rows with a link to the rest, so no card is left
 * mostly empty.
 *
 * A day with nothing booked says so once in the greeting and once in a single
 * "Today" card (the ring at 0 of 0, the next opening) that stands in for both
 * Upcoming work and Today's Progress.
 */
export default function DoctorDashboardPage() {
  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <DoctorOverview />
    </RequireRole>
  );
}

/** Cards in one row share its height from two columns up; stacked on a phone, each keeps its own. */
const STRETCH_ROW = '@pane:items-stretch';

function DoctorOverview() {
  const emptyDay = useHasBookingsToday() === false;
  return (
    <Page>
      <DashboardHero />
      <TodaysSummary />

      <DashboardGroup>
        <DashboardGrid
          columns={2}
          className={cn(STRETCH_ROW, !emptyDay && '@pane:grid-cols-1 @wide:grid-cols-2')}
        >
          {emptyDay ? <TodaysProgress variant="today" /> : <TodaysSchedule />}
          <PatientQueueMini />
        </DashboardGrid>

        <DashboardGrid columns={emptyDay ? 2 : 3} className={STRETCH_ROW}>
          {!emptyDay && <TodaysProgress />}
          <UpcomingAvailability />
          <RecentActivity />
        </DashboardGrid>
      </DashboardGroup>
    </Page>
  );
}
