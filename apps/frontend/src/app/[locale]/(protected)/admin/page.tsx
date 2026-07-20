'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { PlatformKpis } from '@/features/admin/components/platform-kpis';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Admin Workspace's Overview — platform-wide KPI tiles
 * (ORIVEX Roadmap 2.0 Stage 4). The landing page `NAVIGATION_CONFIG`'s
 * "Admin Workspace" group points a super_admin at first.
 */
export default function AdminOverviewPage() {
  const t = useTranslations('admin.overview');

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <PlatformKpis />
      </Page>
    </RequireRole>
  );
}
