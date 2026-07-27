'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

export interface DoctorReviewsListProps {
  doctorProfileId: string;
}

/** §10/§11: public written reviews on the doctor's profile (per the approved scope -- rating aggregate + comments both shown publicly). */
export function DoctorReviewsList({ doctorProfileId }: DoctorReviewsListProps) {
  const t = useTranslations('doctor.profile');
  const format = useFormatter();
  const { data, isLoading } = useDoctorReviews(doctorProfileId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const reviewsWithComments = data?.reviews.filter((review) => review.comment) ?? [];

  if (reviewsWithComments.length === 0) {
    return <EmptyState title={t('reviewsEmptyTitle')} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviewsWithComments.map((review) => (
        <li key={review.id} className="rounded-lg border border-border-default p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-primary">{'★'.repeat(review.rating)}</span>
            <span className="text-xs text-text-tertiary">
              {format.dateTime(new Date(review.createdAt), { dateStyle: 'medium' })}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{review.comment}</p>
        </li>
      ))}
    </ul>
  );
}
