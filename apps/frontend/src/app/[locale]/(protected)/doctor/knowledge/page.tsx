'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ArticleComposer } from '@/features/knowledge/components/article-composer';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function DoctorKnowledgePage() {
  const t = useTranslations('knowledge.doctor');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('subtitle')} />
        <ArticleComposer />
      </Page>
    </RequireRole>
  );
}
