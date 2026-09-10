'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { KnowledgeFeed } from '@/features/knowledge/components/knowledge-feed';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function PatientKnowledgePage() {
  const t = useTranslations('knowledge.patient');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('subtitle')} />
        <KnowledgeFeed />
      </Page>
    </RequireRole>
  );
}
