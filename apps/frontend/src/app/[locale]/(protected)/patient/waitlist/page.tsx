'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { WaitlistPanel } from '@/features/waitlist/components/waitlist-panel';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function PatientWaitlistPage() {
  const t = useTranslations('waitlist');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('subtitle')} />
        <WaitlistPanel />
      </Page>
    </RequireRole>
  );
}
