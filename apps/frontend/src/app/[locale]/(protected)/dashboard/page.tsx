'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DASHBOARD_SUBTITLE_KEY, primaryRole } from '@/features/shell/config/dashboard';
import { useAuth } from '@/shared/auth/auth-context';
import { DashboardGrid, Page } from '@/shared/ui/layout/page';
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
 */
export default function DashboardPage() {
  const t = useTranslations('shell.dashboard');
  const { user } = useAuth();
  const role = user ? primaryRole(user.roles) : undefined;
  const subtitle = role ? t(DASHBOARD_SUBTITLE_KEY[role]) : undefined;

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
