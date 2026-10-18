'use client';

import { useTranslations } from 'next-intl';
import { AdminPaymentsTable } from '@/features/admin/components/admin-payments-table';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Admin Workspace's Payments: every transaction with its refund action
 * (`GET /admin/payments`). The payment KPIs and charts stay on Analytics,
 * which links here -- the table lives in one place only.
 */
export default function AdminPaymentsPage() {
  const t = useTranslations('admin.payments');

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <AdminPaymentsTable />
      </Page>
    </RequireRole>
  );
}
