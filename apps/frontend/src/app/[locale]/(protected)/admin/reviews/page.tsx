'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ReviewModerationQueue } from '@/features/admin/components/review-moderation-queue';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

export default function AdminReviewsPage() {
  const t = useTranslations('admin.reviewModeration');

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('pageDescription')} />
        <ReviewModerationQueue />
      </Page>
    </RequireRole>
  );
}
