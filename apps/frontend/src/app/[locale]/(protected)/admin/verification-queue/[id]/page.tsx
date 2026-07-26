'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { VerificationCaseDetail } from '@/features/admin/components/verification-case-detail';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
 * full verification review page -- Applicant/Verification Info/Subject-
 * specific context/Documents/Actions/History, backed entirely by real
 * `GET /admin/verification-queue/:id` (+ history/accounts/doctors/
 * media-assets) endpoints.
 */
export default function AdminVerificationCaseDetailPage() {
  const t = useTranslations('admin.verificationCase');
  const params = useParams<{ id: string }>();

  return (
    <RequireRole roles={['super_admin']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />
        <VerificationCaseDetail verificationCaseId={params.id} />
      </Page>
    </RequireRole>
  );
}
