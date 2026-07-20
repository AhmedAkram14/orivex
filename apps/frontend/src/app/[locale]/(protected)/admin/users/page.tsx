'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { AccountsTable } from '@/features/admin/components/accounts-table';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function AdminUsersPage() {
  const t = useTranslations('admin.users');

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <AccountsTable />
      </Page>
    </RequireRole>
  );
}
