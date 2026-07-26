'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { useDoctorById } from '@/features/doctor/hooks/use-doctor-by-id';
import { DoctorProfileView } from '@/features/doctor/components/profile/doctor-profile-view';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { ApiError } from '@/shared/lib/api/client';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): the patient-facing
 * doctor profile view -- reuses `DoctorProfileView` verbatim (already
 * role-agnostic/read-only, no PHI), backed by DoctorProfileController's
 * public GET /doctors/:id.
 */
export default function PatientDoctorProfilePage() {
  const t = useTranslations('patient.doctors');
  const params = useParams<{ id: string }>();
  const doctorProfileId = params.id;
  const { data: profile, isLoading, error } = useDoctorById(doctorProfileId);

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('profileTitle')} />
        {isLoading && <Skeleton className="h-96 w-full" />}
        {notFound && <EmptyState title={t('profileNotFoundTitle')} description={t('profileNotFoundDescription')} />}
        {!isLoading && !notFound && error && <Alert variant="danger">{t('loadError')}</Alert>}
        {profile && (
          <>
            <DoctorProfileView profile={profile} />
            <Button asChild>
              <Link href={`/patient/appointments/book?doctorId=${profile.id}`}>{t('bookAppointment')}</Link>
            </Button>
          </>
        )}
      </Page>
    </RequireRole>
  );
}
