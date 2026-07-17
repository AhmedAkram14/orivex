'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { RequireRole } from '@/shared/auth/require-role';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Booking Architecture's patient-facing entry point — deliberately an
 * honest "not available yet" placeholder, not the real slot-selection flow.
 * Booking requires knowing which doctor's schedule to show, and no doctor
 * directory/search exists anywhere in the frontend yet (a real integration
 * decision, not an oversight — see the Scheduling module's own docs).
 * `GET /scheduling/doctor-availability`/`doctor-exceptions` are real,
 * correctly role-guarded endpoints scoped to "the current doctor," which a
 * patient session can never satisfy — this page must not call them.
 */
export default function BookAppointmentPage() {
  const t = useTranslations('patient.appointments');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('bookAppointment')} />

        <EmptyState title={t('bookingUnavailableTitle')} description={t('bookingUnavailableDescription')} />
      </Page>
    </RequireRole>
  );
}
