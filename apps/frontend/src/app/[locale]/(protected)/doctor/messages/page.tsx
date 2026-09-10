'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { MessagingWorkspace } from '@/features/messaging/components/messaging-workspace';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function DoctorMessagesPage() {
  const t = useTranslations('messaging');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('doctorSubtitle')} />
        <MessagingWorkspace role="doctor" />
      </Page>
    </RequireRole>
  );
}
