'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DisputesWorkspace } from '@/features/consultation/components/disputes-workspace';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function DoctorDisputesPage() {
  const t = useTranslations('disputes');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('doctorSubtitle')} />
        <DisputesWorkspace role="doctor" />
      </Page>
    </RequireRole>
  );
}
