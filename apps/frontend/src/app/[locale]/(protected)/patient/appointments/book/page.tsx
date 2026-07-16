'use client';

import { useTranslations } from 'next-intl';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { BookingFlow } from '@/features/scheduling/components/booking-flow';
import { useBookings } from '@/features/scheduling/hooks/use-bookings';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { useDoctorExceptions } from '@/features/scheduling/hooks/use-doctor-exceptions';
import { useHolidays } from '@/features/scheduling/hooks/use-holidays';
import { useSchedulingRules } from '@/features/scheduling/hooks/use-scheduling-rules';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Booking Architecture's patient-facing entry point (Phase 9,
 * Milestone 4) — a real slot-selection → summary → confirmation flow
 * against the doctor's real (mocked) availability. Deliberately not yet
 * unified with `usePatientAppointments`'s own `Appointment` list (Phase
 * 8): the two data models don't share a backend today, so wiring them
 * together here would be exactly the kind of fabricated integration this
 * codebase's "no fake business logic" rule exists to prevent. That
 * unification is real future work, not silently skipped.
 */
export default function BookAppointmentPage() {
  const t = useTranslations('patient.appointments');
  const { data: schedule, isLoading: isLoadingSchedule, isError: isScheduleError } = useDoctorAvailability();
  const { data: exceptions, isLoading: isLoadingExceptions } = useDoctorExceptions();
  const { data: holidays, isLoading: isLoadingHolidays } = useHolidays();
  const { data: rules, isLoading: isLoadingRules } = useSchedulingRules();
  const { data: bookings, isLoading: isLoadingBookings } = useBookings();

  const isLoading = isLoadingSchedule || isLoadingExceptions || isLoadingHolidays || isLoadingRules || isLoadingBookings;

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('bookAppointment')} />

        {isScheduleError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading || !schedule || !rules ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <BookingFlow
            schedule={schedule}
            exceptions={exceptions ?? []}
            holidays={holidays ?? []}
            rules={rules}
            bookings={bookings ?? []}
          />
        )}
      </Page>
    </RequireRole>
  );
}
