'use client';

import { Star } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { usePublicPatient } from '@/features/landing/hooks/use-public-patient';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { ApiError } from '@/shared/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Page } from '@/shared/ui/layout/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
import { cn } from '@/shared/lib/cn';

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * A minimal, chrome-only top bar -- this page lives OUTSIDE the `(protected)`
 * route group deliberately: EXPLORE -> UNDERSTAND -> BUILD TRUST -> TAKE
 * ACTION -> AUTHENTICATE. Public visitors browsing doctors/reviews should
 * never hit a sign-in wall, so this page has no `AppShell` dependency.
 */
function PublicChrome() {
  return (
    <header className="border-b border-border-default bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-text-primary">
          ORIVEX
        </Link>
      </div>
    </header>
  );
}

/**
 * The public patient profile a review's author links to. Deliberately
 * minimal -- backed by PublicPatientResponseDto, which carries only a name
 * and an avatar, never health/contact data (see that DTO's own header
 * comment). Reachable by anyone, no sign-in required, matching this
 * product's public/protected information architecture: clinical data
 * (blood type, allergies, prescriptions, medical history, documents) lives
 * exclusively behind the authenticated, authorized Doctor-facing chart at
 * `/doctor/patients/:id`, never here.
 */
export default function PublicPatientProfilePage() {
  const t = useTranslations('publicPatient');
  const format = useFormatter();
  const params = useParams<{ id: string }>();
  const patientProfileId = params.id;
  const searchParams = useSearchParams();
  const reviewDoctorId = searchParams.get('doctorId') ?? undefined;

  const { data: patient, isLoading, error } = usePublicPatient(patientProfileId);
  const { data: doctorReviews } = useDoctorReviews(reviewDoctorId);

  const notFound = error instanceof ApiError && error.status === 404;
  const reviewForThisPatient = reviewDoctorId
    ? doctorReviews?.reviews.find((review) => review.patientProfileId === patientProfileId)
    : undefined;

  return (
    <>
      <PublicChrome />
      <Page>
        <WorkspaceHeader title={t('title')} />
        {isLoading && <Skeleton className="h-40 w-full" />}
        {notFound && <EmptyState title={t('notFoundTitle')} description={t('notFoundDescription')} />}
        {!isLoading && !notFound && error && <Alert variant="danger">{t('loadError')}</Alert>}
        {patient && (
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <Avatar size="xl">
                  {patient.avatarUrl && <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />}
                  <AvatarFallback>{initialsFor(patient.fullName)}</AvatarFallback>
                </Avatar>
                <p className="text-2xl font-semibold text-text-primary">{patient.fullName}</p>
              </CardContent>
            </Card>

            {reviewForThisPatient && (
              <Card>
                <CardContent className="flex flex-col gap-2 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{t('recentFeedback')}</p>
                    <div className="flex items-center gap-0.5" aria-label={`${reviewForThisPatient.rating}/5`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Icon
                          key={index}
                          icon={Star}
                          size="sm"
                          className={cn(index < reviewForThisPatient.rating ? 'fill-warning text-warning' : 'text-border-strong')}
                        />
                      ))}
                    </div>
                  </div>
                  {reviewForThisPatient.comment && (
                    <p className="text-sm text-text-secondary">&ldquo;{reviewForThisPatient.comment}&rdquo;</p>
                  )}
                  <p className="text-xs text-text-tertiary">
                    {format.dateTime(new Date(reviewForThisPatient.createdAt), { dateStyle: 'medium' })}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </Page>
    </>
  );
}
