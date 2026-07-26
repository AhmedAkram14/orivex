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
 */
export default function DashboardPage() {
  const t = useTranslations('shell.dashboard');
  const { user } = useAuth();
  const router = useRouter();
  const role = user ? primaryRole(user.roles) : undefined;
  const subtitle = role ? t(DASHBOARD_SUBTITLE_KEY[role]) : undefined;
  const isPatientRole = Boolean(user?.roles.includes('patient'));
  const journeyStatus = useJourneyStatus({ enabled: isPatientRole });
  const { needsJourneyChoice, needsPatientIntake } = journeyStatus.data ?? {};

  useEffect(() => {
    if (!isPatientRole) return;
    if (needsJourneyChoice) {
      router.replace('/journey');
    } else if (needsPatientIntake) {
      router.replace('/patient/intake');
    }
  }, [isPatientRole, needsJourneyChoice, needsPatientIntake, router]);

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
