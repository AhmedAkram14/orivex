'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { useDoctorById } from '@/features/doctor/hooks/use-doctor-by-id';
import { DoctorBookingCard } from '@/features/doctor/components/doctor-booking-card';
import { DoctorProfileView } from '@/features/doctor/components/profile/doctor-profile-view';
import { RequireRole } from '@/shared/auth/require-role';
import { ApiError } from '@/shared/lib/api/client';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Page } from '@/shared/ui/layout/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The patient-facing doctor profile -- reuses `DoctorProfileView` (role-agnostic,
 * read-only, no PHI), backed by the public GET /doctors/:id, beside a sticky
 * booking card (desktop, inline-end column) or a pinned bar (below `lg`).
 *
 * The contact block never shows the doctor's personal email or phone to a
 * patient (decided 2026-09): contact goes through ORIVEX Messages. A separate,
 * doctor-published "Clinic phone" field would be an API change, not built.
 */
export default function PatientDoctorProfilePage() {
  const t = useTranslations('patient.doctors');
  const params = useParams<{ id: string }>();
  const doctorProfileId = params.id;
  const { data: profile, isLoading, error, refetch } = useDoctorById(doctorProfileId);

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page className="max-lg:pb-28">
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('profileTitle')} />
        {isLoading && <Skeleton className="h-96 w-full" />}
        {notFound && <EmptyState illustration="search-no-results" title={t('profileNotFoundTitle')} description={t('profileNotFoundDescription')} />}
        {!isLoading && !notFound && error && <ErrorState description={t('loadError')} onRetry={() => void refetch()} />}
        {profile && (
          <div className="grid items-start gap-(--card-gap) lg:grid-cols-[minmax(0,1fr)_320px]">
            <DoctorProfileView profile={profile} variant="public" />
            <DoctorBookingCard doctorProfileId={profile.id} consultationFeeAmount={profile.consultationFeeAmount} />
          </div>
        )}
      </Page>
    </RequireRole>
  );
}
