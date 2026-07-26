'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { BookingFlow } from '@/features/scheduling/components/booking-flow';
import { RequireRole } from '@/shared/auth/require-role';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): the Booking
 * Architecture's real patient-facing entry point -- reached from a
 * doctor's profile page's "Book appointment" CTA (`?doctorId=...`), backed
 * end to end by the real `GET /doctors/:id/availability-windows` and
 * `POST /appointments`. `doctorId` is required (this page has no doctor
 * directory/search of its own) -- reached without one only when a user
 * navigates here directly, an honest edge case, not a "coming soon" one
 * anymore.
 */
export default function BookAppointmentPage() {
  const t = useTranslations('patient.appointments');
  const searchParams = useSearchParams();
  const doctorId = searchParams.get('doctorId');

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('bookAppointment')} />

        {doctorId ? (
          <BookingFlow doctorId={doctorId} />
        ) : (
          <EmptyState title={t('noDoctorSelectedTitle')} description={t('noDoctorSelectedDescription')} />
        )}
      </Page>
    </RequireRole>
  );
}
