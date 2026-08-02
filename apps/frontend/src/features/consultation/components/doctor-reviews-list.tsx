'use client';

import { Star, UserRound } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { Icon } from '@/shared/icons/icon';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface DoctorReviewsListProps {
  doctorProfileId: string;
}

/**
 * §10/§11: public written reviews on the doctor's profile (per the approved
 * scope -- rating aggregate + comments both shown publicly). Doctor Profile
 * Redesign (2026-08-02): upgraded to card styling matching the rest of the
 * redesigned Profile page -- still deliberately avatar-less/name-less. The
 * real `ConsultationFeedback` shape has no patient name, photo, consultation
 * type, or "verified" flag (reviews are anonymized in this app for patient
 * privacy) -- a generic "patient" icon avatar stands in, never an invented
 * identity.
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
    return <EmptyState icon={UserRound} title={t('reviewsEmptyTitle')} description={t('reviewsEmptyDescription')} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviewsWithComments.map((review) => (
        <li key={review.id} className="flex gap-3 rounded-2xl border border-border-default p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
            <Icon icon={UserRound} size="sm" label={t('anonymousPatient')} />
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
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
              <span className="text-xs text-text-tertiary">
                {format.dateTime(new Date(review.createdAt), { dateStyle: 'medium' })}
              </span>
            </div>
            <p className="text-sm text-text-secondary">{review.comment}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
