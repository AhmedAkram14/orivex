'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { HospitalsManager } from '@/features/admin/components/hospitals-manager';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function AdminHospitalsPage() {
  const t = useTranslations('admin.hospitals');

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <HospitalsManager />
      </Page>
    </RequireRole>
  );
}
