'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { AppointmentsWorkspace } from '@/features/doctor/components/appointments/appointments-workspace';
import { RequireRole } from '@/shared/auth/require-role';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * Phase 2 (Appointment Visibility & Consultation History): the previously
 * missing doctor Appointments view -- `/doctor/appointments` 404'd before
 * this page existed (confirmed in IMPLEMENTATION_NOTES.md's Phase 0
 * discovery). Appointment functionality used to be split across
 * `/doctor/schedule` (calendar grid), `/doctor/queue` (today only), and
 * pending-approval on the Overview page, with no unified list/detail route
 * -- this is that route. Thin page shell, same convention as
 * `doctor/reports/page.tsx`/`doctor/queue/page.tsx`: all real logic lives in
 * `AppointmentsWorkspace`.
 */
export default function DoctorAppointmentsPage() {
  const t = useTranslations('doctor.appointments');

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('description')} />
        <AppointmentsWorkspace />
      </Page>
    </RequireRole>
  );
}
