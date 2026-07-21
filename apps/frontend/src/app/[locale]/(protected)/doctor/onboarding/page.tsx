'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { OnboardingFlow } from '@/features/doctor/components/onboarding/onboarding-flow';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * Doctor Onboarding (Phase 4 continuation) -- gated to `patient` only:
 * every account starts and stays Patient through the entire Draft/Pending/
 * Rejected lifecycle (`PromoteDoctorRoleOnVerificationHandler` promotes to
 * Doctor automatically the moment an admin approves), so an already-Doctor
 * account has no reason to be here and is correctly redirected away.
 */
export default function DoctorOnboardingPage() {
  const t = useTranslations('doctor.onboarding');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <OnboardingFlow />
      </Page>
    </RequireRole>
  );
}
