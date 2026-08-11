'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useJourneyStatus } from '@/features/journey/hooks/use-journey-status';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DASHBOARD_SUBTITLE_KEY, primaryRole } from '@/features/shell/config/dashboard';
import { useAuth } from '@/shared/auth/auth-context';
import { useRouter } from '@/shared/i18n/navigation';
import { DashboardGrid, Page } from '@/shared/ui/layout/page';
import { LoadingState } from '@/shared/ui/loading-state';
import { QuickActions } from '@/shared/ui/layout/quick-actions';
import { RecentActivityContainer } from '@/shared/ui/layout/recent-activity';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The authenticated landing page — real and working today, with content
 * that differs by role through `DASHBOARD_SUBTITLE_KEY` (one shared page,
 * not six duplicated role layouts, per this phase's "shared architecture
 * only" rule). No fabricated KPI numbers: no Patients/Doctors/Appointments
 * module exists in the frontend yet (this phase's own explicit scope), so
 * "recent activity" is an honest empty state rather than invented data.
 *
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): the one place that
 * ever redirects to `/journey` -- only for a `patient`-role session (a
 * `doctor`-role account always already has a DoctorProfile by definition)
 * whose Choose-Your-Journey status turns out to need a choice. Every
 * repeat visit for an already-provisioned account renders this page
 * exactly as before -- purely additive, not a behavior change for anyone
 * who already made their choice.
 *
 * Doctor Workspace redesign follow-up (2026-08-04): a `doctor`-role
 * session redirects straight to `/doctor` (Overview) instead of ever
 * rendering this generic shared page -- Overview already is the doctor's
 * real dashboard (KPIs, schedule, queue, all real data), so this page's
 * honest-but-empty "nothing to show yet" placeholder would only ever be a
 * confusing dead end for that role. Every other role still renders this
 * shared page exactly as before -- no dedicated workspace exists for
 * super_admin/hospital_admin/nurse/receptionist yet.
 */
export default function DashboardPage() {
  const t = useTranslations('shell.dashboard');
  const { user } = useAuth();
  const router = useRouter();
  const role = user ? primaryRole(user.roles) : undefined;
  const subtitle = role ? t(DASHBOARD_SUBTITLE_KEY[role]) : undefined;
  const isDoctorRole = role === 'doctor';
  const isPatientRole = Boolean(user?.roles.includes('patient'));
  const journeyStatus = useJourneyStatus({ enabled: isPatientRole });
  const { needsJourneyChoice, needsPatientIntake } = journeyStatus.data ?? {};

  useEffect(() => {
    if (isDoctorRole) {
      router.replace('/doctor');
      return;
    }
    if (!isPatientRole) return;
    if (needsJourneyChoice) {
      router.replace('/journey');
    } else if (needsPatientIntake) {
      router.replace('/patient/intake');
    }
  }, [isDoctorRole, isPatientRole, needsJourneyChoice, needsPatientIntake, router]);

  if (isDoctorRole) {
    return <LoadingState />;
  }

  if (isPatientRole && (journeyStatus.isPending || needsJourneyChoice || needsPatientIntake)) {
    return <LoadingState />;
  }

  return (
    <Page>
      <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={subtitle} />
      <DashboardGrid columns={2}>
        <QuickActions
          actions={[{ id: 'security', label: t('securityCenterAction'), icon: ShieldCheck, href: '/security' }]}
        />
        <RecentActivityContainer
          title={t('recentActivityTitle')}
          isEmpty
          items={[]}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
        />
      </DashboardGrid>
    </Page>
  );
}
