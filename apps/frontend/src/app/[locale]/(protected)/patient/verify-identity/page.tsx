'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { IdentityVerificationFlow } from '@/features/patient/components/identity-verification/identity-verification-flow';
import { parseReturnTo } from '@/shared/verification/return-to';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.7): Patient Identity
 * Verification's own route -- reached either from a gated action's
 * "Verify your identity to continue" screen (carrying `?returnTo=`, §7a)
 * or directly via a nav link (no `returnTo`, Approved just offers the
 * dashboard).
 */
export default function PatientVerifyIdentityPage() {
  const t = useTranslations('patient.identityVerification');
  const searchParams = useSearchParams();
  const returnTo = parseReturnTo(searchParams.get('returnTo'));

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <IdentityVerificationFlow returnTo={returnTo} />
      </Page>
    </RequireRole>
  );
}
