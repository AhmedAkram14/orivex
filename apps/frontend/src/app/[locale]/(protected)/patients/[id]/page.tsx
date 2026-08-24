'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { usePublicPatient } from '@/features/landing/hooks/use-public-patient';
import { RequireAuth } from '@/shared/auth/require-auth';
import { Alert } from '@/shared/ui/alert';
import { ApiError } from '@/shared/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Page } from '@/shared/ui/layout/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * The public patient profile a review's author links to. Deliberately
 * minimal -- backed by PublicPatientResponseDto, which carries only a name
 * and an avatar, never health/contact data (see that DTO's own header
 * comment). Reachable by any authenticated account, not just the reviewed
 * doctor -- matches the review itself already being shown publicly on the
 * doctor's profile.
 */
export default function PublicPatientProfilePage() {
  const t = useTranslations('publicPatient');
  const params = useParams<{ id: string }>();
  const patientProfileId = params.id;
  const { data: patient, isLoading, error } = usePublicPatient(patientProfileId);

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <RequireAuth redirectTo="/unauthorized">
      <Page>
        <WorkspaceHeader title={t('title')} />
        {isLoading && <Skeleton className="h-40 w-full" />}
        {notFound && <EmptyState title={t('notFoundTitle')} description={t('notFoundDescription')} />}
        {!isLoading && !notFound && error && <Alert variant="danger">{t('loadError')}</Alert>}
        {patient && (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <Avatar size="xl">
                {patient.avatarUrl && <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />}
                <AvatarFallback>{initialsFor(patient.fullName)}</AvatarFallback>
              </Avatar>
              <p className="text-2xl font-semibold text-text-primary">{patient.fullName}</p>
            </CardContent>
          </Card>
        )}
      </Page>
    </RequireAuth>
  );
}
