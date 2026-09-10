'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { KnowledgeModerationQueue } from '@/features/admin/components/knowledge-moderation-queue';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function AdminKnowledgePage() {
  const t = useTranslations('admin.knowledgeModeration');

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('pageDescription')} />
        <KnowledgeModerationQueue />
      </Page>
    </RequireRole>
  );
}
