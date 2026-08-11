'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ActivePrescriptionsWidget } from '@/features/patient/components/active-prescriptions-widget';
import { BecomeADoctorCta } from '@/features/patient/components/become-a-doctor-cta';
import { HealthSummary } from '@/features/patient/components/health-summary';
import { NextAppointmentCard } from '@/features/patient/components/next-appointment-card';
import { PatientQuickActions } from '@/features/patient/components/patient-quick-actions';
import { RecentActivity } from '@/features/patient/components/recent-activity';
import { RecentMedicalRecordsWidget } from '@/features/patient/components/recent-medical-records-widget';
import { UpcomingAppointmentsWidget } from '@/features/patient/components/upcoming-appointments-widget';
import { WelcomeHeader } from '@/features/patient/components/welcome-header';
import { useJourneyStatus } from '@/features/journey/hooks/use-journey-status';
import { RequireRole } from '@/shared/auth/require-role';
import { useRouter } from '@/shared/i18n/navigation';
import { LoadingState } from '@/shared/ui/loading-state';
import { DashboardGrid, Page } from '@/shared/ui/layout/page';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Patient Portal's dashboard — the patient-specific landing page,
 * distinct from the shared `/dashboard` (every role) and reachable only by
 * the `patient` role (`RequireRole`).
 *
 * Premium-dashboard redesign (mirrors the Doctor Workspace's own hero →
 * KPIs → widgets hierarchy): compact `WelcomeHeader` → full-width
 * `NextAppointmentCard` (the real next upcoming appointment, the page's
 * single focal point) → full-width `HealthSummary` row → `UpcomingAppointmentsWidget`
 * (the next few, "View all" to the full page) → `ActivePrescriptionsWidget` /
 * `RecentActivity` → `RecentMedicalRecordsWidget` / compact `PatientQuickActions`
 * + `BecomeADoctorCta`. `NextAppointmentCard` and `HealthSummary` are each
 * their own full-width row rather than a side-by-side pair -- a short hero
 * card next to a taller 3-tile stack left a dead gap under the shorter one
 * no matter how their cross-axis alignment was tuned, since CSS Grid still
 * sized the row itself to the taller sibling. Every widget composes an
 * existing real hook/query — this redesign changes layout and hierarchy
 * only, never the data sources or routes underneath.
 *
 * Product follow-up (2026-07-26): also guards against reaching this page
 * with an incomplete `PatientProfile` -- e.g. a bookmarked `/patient` link,
 * or navigating back mid-intake -- redirecting to `/patient/intake` until
 * the required fields are on record. `/journey`'s "book appointments" card
 * itself already routes to `/patient/intake` first, this is the fallback.
 */
export default function PatientDashboardPage() {
  const t = useTranslations('patient.dashboard');
  const router = useRouter();
  const journeyStatus = useJourneyStatus();
  const { needsPatientIntake, hasDoctorProfile } = journeyStatus.data ?? {};

  useEffect(() => {
    if (needsPatientIntake) {
      router.replace('/patient/intake');
    }
  }, [needsPatientIntake, router]);

  if (journeyStatus.isPending || needsPatientIntake) {
    return <LoadingState />;
  }

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />
        <WelcomeHeader />

        <NextAppointmentCard />
        <HealthSummary />

        <UpcomingAppointmentsWidget />

        <DashboardGrid columns={2}>
          <ActivePrescriptionsWidget />
          <RecentActivity />
        </DashboardGrid>

        <DashboardGrid columns={2}>
          <RecentMedicalRecordsWidget />
          <WidgetContainer
            title={<span className="text-lg font-semibold">{t('quickActionsTitle')}</span>}
            className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          >
            <div className="flex flex-col gap-4">
              <PatientQuickActions />
              {hasDoctorProfile === false && <BecomeADoctorCta />}
            </div>
          </WidgetContainer>
        </DashboardGrid>
      </Page>
    </RequireRole>
  );
}
