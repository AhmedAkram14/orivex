'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ActivePrescriptionsWidget } from '@/features/patient/components/active-prescriptions-widget';
import { HealthSnapshotCard } from '@/features/patient/components/health-snapshot-card';
import { NeedsAttentionCard } from '@/features/patient/components/needs-attention-card';
import { NextAppointmentCard } from '@/features/patient/components/next-appointment-card';
import { ProfileNudgeCard } from '@/features/patient/components/profile-nudge-card';
import { PatientSummaryStrip } from '@/features/patient/components/patient-summary-strip';
import { PatientQuickActions } from '@/features/patient/components/patient-quick-actions';
import { RecentActivity } from '@/features/patient/components/recent-activity';
import { RecentMedicalRecordsWidget } from '@/features/patient/components/recent-medical-records-widget';
import { UpcomingAppointmentsWidget } from '@/features/patient/components/upcoming-appointments-widget';
import { WelcomeHeader } from '@/features/patient/components/welcome-header';
import { useJourneyStatus } from '@/features/journey/hooks/use-journey-status';
import { RequireRole } from '@/shared/auth/require-role';
import { useRouter } from '@/shared/i18n/navigation';
import { HeroSurface } from '@/shared/ui/hero-surface';
import { DashboardGrid, DashboardGroup, Page } from '@/shared/ui/layout/page';
import { RouteLoadingSkeleton } from '@/shared/ui/layout/route-loading-skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

/**
 * The Patient Portal's dashboard -- reachable only by the `patient` role.
 * ONE patient HeroSurface (the greeting is the page's h1) carrying the
 * patient's next step (their next appointment, or a Book CTA); then the
 * needs-attention list (only when non-empty), ONE MetricStrip, and widgets
 * that size to their content (`items-start`, so a short card never stretches
 * to a tall neighbour and sits half-empty). Every widget composes an existing
 * real hook.
 *
 * Three groups, `--group-gap` apart; cards inside a group `--card-gap` apart
 * on both axes. The activity feed (the tallest list) stands beside a column of
 * prescriptions and quick actions, so the two sides end near the same line,
 * and the records list takes the full width below.
 *
 * Profile-completion gate: an incomplete `PatientProfile` is redirected to
 * `/patient/intake` -- but only for the three things booking needs (date of
 * birth, gender, phone); the rest is the optional ProfileNudgeCard.
 */
export default function PatientDashboardPage() {
  const t = useTranslations('patient.dashboard');
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
          <HealthSnapshotCard />
        </DashboardGroup>

        {/* The widgets. */}
        <DashboardGroup>
          <UpcomingAppointmentsWidget />

          <DashboardGrid columns={2}>
            <DashboardGroup>
              <ActivePrescriptionsWidget />
              <WidgetContainer title={<span className="text-h3">{t('quickActionsTitle')}</span>} titleAs="h2">
                <PatientQuickActions />
              </WidgetContainer>
            </DashboardGroup>
            <RecentActivity />
          </DashboardGrid>

          <RecentMedicalRecordsWidget />
        </DashboardGroup>
      </Page>
    </RequireRole>
  );
}
