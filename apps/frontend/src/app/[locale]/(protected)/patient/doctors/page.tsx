'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { DoctorDirectoryBrowser } from '@/features/patient/components/doctor-directory/doctor-directory-browser';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): Browse/Search
 * Doctors -- immediately reachable, no identity-verification gate.
 * `?specialtyId=` pre-filters when arriving from `/patient/specialties`.
 */
export default function PatientDoctorsPage() {
  const t = useTranslations('patient.doctors');
  const searchParams = useSearchParams();
  const specialtyId = searchParams.get('specialtyId') ?? undefined;

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <DoctorDirectoryBrowser initialSpecialtyId={specialtyId} />
      </Page>
    </RequireRole>
  );
}
