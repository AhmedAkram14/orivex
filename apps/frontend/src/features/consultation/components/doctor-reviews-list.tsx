'use client';

import { Star } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface DoctorReviewsListProps {
  doctorProfileId: string;
}

function initialsFor(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * §10/§11: public written reviews on the doctor's profile (per the approved
 * scope -- rating aggregate + comments both shown publicly). Each review
 * names and links to its real author (their own explicit choice to make
 * reviews non-anonymous), backed by ConsultationFeedbackResponseDto's
 * patientName/patientAvatarUrl and the minimal public patient-profile
 * endpoint the link opens -- never an invented identity, and never more of
 * the patient's real data than that endpoint deliberately exposes.
 */
export function DoctorReviewsList({ doctorProfileId }: DoctorReviewsListProps) {
  const t = useTranslations('doctor.profile');
  const format = useFormatter();
  const { data, isLoading } = useDoctorReviews(doctorProfileId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const reviewsWithComments = data?.reviews.filter((review) => review.comment) ?? [];

  if (reviewsWithComments.length === 0) {
    return <EmptyState title={t('reviewsEmptyTitle')} description={t('reviewsEmptyDescription')} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviewsWithComments.map((review) => (
        <li key={review.id} className="flex gap-3 rounded-2xl border border-border-default p-4">
          <Link href={`/patients/${review.patientProfileId}?doctorId=${doctorProfileId}`} className="shrink-0">
            <Avatar size="sm">
              {review.patientAvatarUrl && <AvatarImage src={review.patientAvatarUrl} alt={review.patientName} />}
              <AvatarFallback>{initialsFor(review.patientName)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/patients/${review.patientProfileId}?doctorId=${doctorProfileId}`}
                className="text-sm font-medium text-text-primary hover:underline"
              >
                {review.patientName}
              </Link>
              <span className="text-xs text-text-tertiary">
                {format.dateTime(new Date(review.createdAt), { dateStyle: 'medium' })}
              </span>
            </div>
            <div className="flex items-center gap-0.5" aria-label={`${review.rating}/5`}>
              {Array.from({ length: 5 }, (_, index) => (
                <Icon
                  key={index}
                  icon={Star}
                  size="sm"
                  className={cn(index < review.rating ? 'fill-warning text-warning' : 'text-border-strong')}
                />
              ))}
            </div>
            <p className="text-sm text-text-secondary">{review.comment}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
