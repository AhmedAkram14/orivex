'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { AdminOverviewPanels } from '@/features/admin/components/admin-overview';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Admin Workspace's Overview -- an operational triage home: the work
 * queues that need an admin now, then a compact platform-health strip that
 * links into Analytics (`GET /admin/overview`). The landing page
 * `NAVIGATION_CONFIG`'s "Admin Workspace" group points a super_admin at first.
 */
export default function AdminOverviewPage() {
  const t = useTranslations('admin.overview');

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <AdminOverviewPanels />
      </Page>
    </RequireRole>
  );
}
