'use client';

import { MessageSquareText, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface DoctorRatingSummaryProps {
  doctorProfileId: string;
  className?: string;
}

export interface RatingLineProps {
  averageRating: number | null | undefined;
  ratingCount: number;
  writtenReviewCount: number;
  className?: string;
}

/**
 * The doctor card's rating, as ONE line: "★ 4.9 · 10 ratings · 10 reviews" (written reviews only when there are any).
 * One line keeps the card's text block at three lines -- name, specialty, rating -- beside a top-aligned photo.
 * A size container: in the narrowest cards (a three-column grid just past its breakpoint leaves ~170px) the
 * written-review count shows as a comment icon and its number instead of wrapping to a fourth line; its full
 * wording stays available as the tooltip and to screen readers.
 */
export function RatingLine({ averageRating, ratingCount, writtenReviewCount, className }: RatingLineProps) {
  const t = useTranslations('consultation.rating');
  const reviews = t('reviewsCount', { count: writtenReviewCount });
  return (
    <div className={cn('@container min-w-0', className)}>
      <p className="flex items-center gap-x-1 whitespace-nowrap text-small text-text-tertiary">
        <Icon icon={Star} size="sm" className="shrink-0 fill-warning text-warning" />
        <span className="font-semibold text-text-primary tabular-nums">{averageRating?.toFixed(1)}</span>
        <span aria-hidden="true">·</span>
        <span>{t('ratingsCount', { count: ratingCount })}</span>
        {writtenReviewCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="hidden @[11.75rem]:inline">{reviews}</span>
            <span className="inline-flex items-center gap-0.5 @[11.75rem]:hidden" title={reviews}>
              <Icon icon={MessageSquareText} size="xs" className="shrink-0" />
              <span aria-hidden="true" className="tabular-nums">{writtenReviewCount}</span>
              <span className="sr-only">{reviews}</span>
            </span>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * §10/§11 of the consultation-completion follow-up: "the real Doctor
 * Directory and Doctor Profile should use actual review data" -- reviews
 * are the sole source, never a manually-editable field. Renders nothing
 * (not a fabricated "0.0 · 0 reviews") until real data loads, and an honest
 * "no reviews yet" state once it has, rather than inventing a rating.
 */
export function DoctorRatingSummary({ doctorProfileId, className }: DoctorRatingSummaryProps) {
  const t = useTranslations('consultation.rating');
  const { data, isLoading } = useDoctorReviews(doctorProfileId);

  if (isLoading || !data) {
    return null;
  }

  if (data.reviewCount === 0) {
    return <p className={className}>{t('noReviewsYet')}</p>;
  }

  const writtenReviewCount = data.reviews.filter((review) => review.comment).length;

  return (
    <RatingLine
      averageRating={data.averageRating}
      ratingCount={data.reviewCount}
      writtenReviewCount={writtenReviewCount}
      className={className}
    />
  );
}
