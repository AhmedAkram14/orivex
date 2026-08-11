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
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Patient Portal's dashboard — the patient-specific landing page,
 * distinct from the shared `/dashboard` (every role) and reachable only by
 * the `patient` role (`RequireRole`).
 *
 * Premium-dashboard redesign (mirrors the Doctor Workspace's own hero →
 * KPIs → widgets hierarchy): compact `WelcomeHeader` → `NextAppointmentCard`
 * (the real next upcoming appointment, the page's single focal point) +
 * `HealthSummary` (stacked) → `UpcomingAppointmentsWidget` (the next few,
 * "View all" to the full page) → `ActivePrescriptionsWidget` / `RecentActivity`
 * → `RecentMedicalRecordsWidget` / compact `PatientQuickActions` +
 * `BecomeADoctorCta`. Every widget composes an existing real hook/query —
 * this redesign changes layout and hierarchy only, never the data sources
 * or routes underneath.
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

        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
          <NextAppointmentCard />
          <HealthSummary layout="column" />
        </div>

        <UpcomingAppointmentsWidget />

        <DashboardGrid columns={2}>
          <ActivePrescriptionsWidget />
          <RecentActivity />
        </DashboardGrid>

        <DashboardGrid columns={2}>
          <RecentMedicalRecordsWidget />
          <div className="flex flex-col gap-4">
            <PatientQuickActions />
            {hasDoctorProfile === false && <BecomeADoctorCta />}
          </div>
        </DashboardGrid>
      </Page>
    </RequireRole>
  );
}
