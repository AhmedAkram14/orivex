'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ReportsSummary } from '@/features/doctor/components/reports/reports-summary';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Workspace's "Reports" page — real appointment-status counts
 * and the doctor's real rating aggregate, never a fabricated trend.
 */
export default function DoctorReportsPage() {
  const t = useTranslations('doctor.reports');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <ReportsSummary />
      </Page>
    </RequireRole>
  );
}
