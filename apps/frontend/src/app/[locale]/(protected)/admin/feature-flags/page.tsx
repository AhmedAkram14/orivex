'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { FeatureFlagsPanel } from '@/features/admin/components/feature-flags-panel';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function AdminFeatureFlagsPage() {
  const t = useTranslations('admin.featureFlags');

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <FeatureFlagsPanel />
      </Page>
    </RequireRole>
  );
}
