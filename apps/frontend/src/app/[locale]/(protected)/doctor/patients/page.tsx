'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { PatientsList } from '@/features/doctor/components/patients/patients-list';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Workspace's "Patients" page — every distinct patient this
 * doctor has ever had a real appointment with (`GET
 * /appointments/doctor/patients`), never a fabricated roster.
 */
export default function DoctorPatientsPage() {
  const t = useTranslations('doctor.patients');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <PatientsList />
      </Page>
    </RequireRole>
  );
}
