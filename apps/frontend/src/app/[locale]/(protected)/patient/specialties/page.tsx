'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { SpecialtyDirectoryBrowser } from '@/features/patient/components/specialty-directory/specialty-directory-browser';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.5): Browse Specialties -- immediately reachable, no identity-verification gate. */
export default function PatientSpecialtiesPage() {
  const t = useTranslations('patient.specialties');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <SpecialtyDirectoryBrowser />
      </Page>
    </RequireRole>
  );
}
