'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { Icon } from '@/shared/icons/icon';

export interface DoctorRatingSummaryProps {
  doctorProfileId: string;
  className?: string;
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

  return (
    <div className={className ? `flex items-center gap-1 ${className}` : 'flex items-center gap-1'}>
      <Icon icon={Star} size="sm" className="fill-warning text-warning" />
      <span className="text-sm font-medium text-text-primary">{data.averageRating?.toFixed(1)}</span>
      <span className="text-sm text-text-tertiary">{t('reviewCount', { count: data.reviewCount })}</span>
    </div>
  );
}
