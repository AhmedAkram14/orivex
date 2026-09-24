'use client';

import { Star } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { FlagReviewAction } from '@/features/consultation/components/flag-review-action';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface DoctorReviewsListProps {
  doctorProfileId: string;
  /**
   * 'workspace' -- rendered on the doctor's own dashboard/profile, viewing
   * their own reviews. Each reviewer links to the real, authorized
   * Doctor-facing Patient Chart (`/doctor/patients/:id`), since this doctor
   * genuinely has a treating relationship with everyone who reviewed them.
   * 'public' (default) -- rendered on the patient-facing doctor profile,
   * where the viewer may not even be signed in; links to the minimal public
   * patient page instead. Same component, same data, only the destination
   * changes with who's actually looking.
   */
  variant?: 'workspace' | 'public';
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
export function DoctorReviewsList({ doctorProfileId, variant = 'public' }: DoctorReviewsListProps) {
  const t = useTranslations('doctor.profile');
  const tRating = useTranslations('consultation.rating');
  const format = useFormatter();
  const { data, isLoading } = useDoctorReviews(doctorProfileId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  // Every real review, not only the ones with a written comment -- a
  // rating-only review used to be silently dropped from this list while
  // still counting toward the header's aggregate rating/count, so a doctor
  // with (say) 3 ratings and 2 written comments would see only 2 reviews
  // here with the third nowhere to be found.
  const reviews = data?.reviews ?? [];

  if (reviews.length === 0) {
    return <EmptyState title={t('reviewsEmptyTitle')} description={t('reviewsEmptyDescription')} />;
  }

  const hrefFor = (patientProfileId: string) =>
    variant === 'workspace' ? `/doctor/patients/${patientProfileId}` : `/patients/${patientProfileId}?doctorId=${doctorProfileId}`;

  const dimensions: Array<{ key: string; value: number | null | undefined }> = [
    { key: 'communicationLabel', value: data?.averageCommunicationRating },
    { key: 'punctualityLabel', value: data?.averagePunctualityRating },
    { key: 'thoroughnessLabel', value: data?.averageThoroughnessRating },
  ].filter((dimension) => dimension.value != null);

  return (
    <ul className="flex flex-col gap-3">
      {dimensions.length > 0 && (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border-default bg-surface-subtle p-3">
          {dimensions.map((dimension) => (
            <span key={dimension.key} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span>{tRating(dimension.key)}</span>
              <Icon icon={Star} size="sm" className="fill-warning text-warning" />
              <span className="font-medium text-text-primary">{dimension.value?.toFixed(1)}</span>
            </span>
          ))}
        </li>
      )}
      {reviews.map((review) => (
        <li key={review.id} className="flex gap-3 rounded-2xl border border-border-default p-4">
          {/* Same destination as the name link right beside it -- an
              adjacent duplicate, not two different actions, so it's an
              `aria-hidden` decorative link rather than a second
              screen-reader stop announcing nothing. */}
          <Link href={hrefFor(review.patientProfileId)} className="shrink-0" aria-hidden="true" tabIndex={-1}>
            <Avatar size="sm">
              {review.patientAvatarUrl && <AvatarImage src={review.patientAvatarUrl} alt="" />}
              <AvatarFallback>{initialsFor(review.patientName)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <Link href={hrefFor(review.patientProfileId)} className="text-sm font-medium text-text-primary hover:underline">
                {review.patientName}
              </Link>
              <span className="text-xs text-text-tertiary">
                {format.dateTime(new Date(review.createdAt), { dateStyle: 'medium' })}
              </span>
            </div>
            {/*
             * Phase 8: `role="img"` + a real localized aria-label ("Rated 4
             * out of 5") on the container -- previously a raw, unlocalized
             * `"4/5"` string with no `role`, so a screen reader had no
             * signal this group of 5 unlabeled icons was one thing to
             * announce once rather than five things to step through. Each
             * `Icon` below stays `aria-hidden` (its default when no `label`
             * prop is passed, see `shared/icons/icon.tsx`), so only the
             * container's own label is ever announced.
             */}
            <div className="flex items-center gap-0.5" role="img" aria-label={tRating('ratedOutOf5', { rating: review.rating })}>
              {Array.from({ length: 5 }, (_, index) => (
                <Icon
                  key={index}
                  icon={Star}
                  size="sm"
                  className={cn(index < review.rating ? 'fill-warning text-warning' : 'text-border-strong')}
                />
              ))}
            </div>
            {review.comment && <p className="text-sm text-text-secondary">{review.comment}</p>}
            {variant === 'workspace' && (
              <div className="mt-1">
                <FlagReviewAction feedbackId={review.id} doctorProfileId={doctorProfileId} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
