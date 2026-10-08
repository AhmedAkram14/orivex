'use client';

import { useEffect } from 'react';
import { ActivePrescriptionsWidget } from '@/features/patient/components/active-prescriptions-widget';
import { HealthSnapshotCard } from '@/features/patient/components/health-snapshot-card';
import { NeedsAttentionCard } from '@/features/patient/components/needs-attention-card';
import { NextAppointmentCard } from '@/features/patient/components/next-appointment-card';
import { ProfileNudgeCard } from '@/features/patient/components/profile-nudge-card';
import { PatientSummaryStrip } from '@/features/patient/components/patient-summary-strip';
import { RecentActivity } from '@/features/patient/components/recent-activity';
import { RecentMedicalRecordsWidget } from '@/features/patient/components/recent-medical-records-widget';
import { UpcomingAppointmentsWidget } from '@/features/patient/components/upcoming-appointments-widget';
import { WelcomeHeader } from '@/features/patient/components/welcome-header';
import { useJourneyStatus } from '@/features/journey/hooks/use-journey-status';
import { RequireRole } from '@/shared/auth/require-role';
import { useRouter } from '@/shared/i18n/navigation';
import { HeroSurface } from '@/shared/ui/hero-surface';
import { DashboardGroup, Page } from '@/shared/ui/layout/page';
import { RouteLoadingSkeleton } from '@/shared/ui/layout/route-loading-skeleton';
import { cn } from '@/shared/lib/cn';

/**
 * The Patient Portal's dashboard -- reachable only by the `patient` role.
 * ONE patient HeroSurface (the greeting is the page's h1) carrying the
 * patient's next step (their next appointment, or a Book CTA); then the
 * needs-attention list (only when non-empty), ONE MetricStrip and the upcoming
 * appointments; then the card area. Every widget composes an existing real hook.
 *
 * Three blocks, `--group-gap` apart; inside the card area every gap, across and
 * down, is `--card-gap`. From 1024px the area is a grid: Health snapshot across
 * the top (when there is anything to show), then Active prescriptions over
 * Recent medical records beside Recent activity. The rows stretch, so both
 * columns end on the same line: the records card takes the space the left
 * column has left over. Below 1024px it is one column in reading order.
 * Quick actions are not on this page: booking is the hero's call to action and
 * the sidebar's Browse Doctors, and records and prescriptions are these cards'
 * own "View all" links and their sidebar entries.
 *
 * Profile-completion gate: an incomplete `PatientProfile` is redirected to
 * `/patient/intake` -- but only for the three things booking needs (date of
 * birth, gender, phone); the rest is the optional ProfileNudgeCard.
 */
// One card style for the area: 16px from each header to its content, 20px card padding on phones.
// Health snapshot renders nothing when there is nothing to show, so its row exists only while it does
// (an empty grid row would still add a gap).
const OVERVIEW_CARDS = cn(
  'grid grid-cols-1 gap-(--card-gap) [--card-head-gap:16px] max-sm:[--card-pad:20px]',
  "lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'rx_activity'_'records_activity']",
  "lg:has-[>[data-slot=health-snapshot]]:grid-rows-[auto_auto_1fr] lg:has-[>[data-slot=health-snapshot]]:[grid-template-areas:'snapshot_snapshot'_'rx_activity'_'records_activity']",
);

export default function PatientDashboardPage() {
  const router = useRouter();
  const journeyStatus = useJourneyStatus();
  const { needsPatientIntake } = journeyStatus.data ?? {};

  useEffect(() => {
    if (needsPatientIntake) {
      router.replace('/patient/intake');
    }
  }, [needsPatientIntake, router]);

  if (journeyStatus.isPending || needsPatientIntake) {
    return <RouteLoadingSkeleton />;
  }

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <HeroSurface variant="patient" className="flex flex-col gap-6">
          <WelcomeHeader />
          <NextAppointmentCard />
        </HeroSurface>

        {/* Where things stand. */}
        <DashboardGroup>
          <NeedsAttentionCard />
          <PatientSummaryStrip />
          <ProfileNudgeCard />
          <UpcomingAppointmentsWidget />
        </DashboardGroup>

        {/* The card area: DOM order is the one-column reading order (snapshot, prescriptions, activity, records). */}
        <div data-slot="overview-cards" className={OVERVIEW_CARDS}>
          <HealthSnapshotCard className="lg:[grid-area:snapshot]" />
          <ActivePrescriptionsWidget className="lg:[grid-area:rx]" />
          <RecentActivity className="lg:[grid-area:activity]" />
          <RecentMedicalRecordsWidget className="lg:[grid-area:records]" />
        </div>
      </Page>
    </RequireRole>
  );
}
