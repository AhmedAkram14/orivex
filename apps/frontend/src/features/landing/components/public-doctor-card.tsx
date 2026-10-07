'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { PublicDoctor } from '@/features/landing/api/types';
import { RatingLine } from '@/features/consultation/components/doctor-rating-summary';
import { MIN_RATING_COUNT_FOR_CONFIDENT_DISPLAY } from '@/features/consultation/lib/rating-display';
import { DoctorCard } from '@/features/doctor/components/doctor-card';
import { Text } from '@/design-system/typography';
import { pickLocalizedName } from '@/shared/i18n/localized-name';

/** Landing already has the rating aggregate inline in its own bulk `/public/doctors` payload -- built here and passed into the shared card's `ratingSlot`, rather than the card re-fetching it per doctor. */
function PopularDoctorRating({ doctor }: { doctor: PublicDoctor }) {
  const t = useTranslations('landing.popularDoctors');

  if (doctor.reviewCount === 0) {
    return (
      <Text size="sm" tone="tertiary">
        {t('noReviewsYet')}
      </Text>
    );
  }

  return (
    <RatingLine averageRating={doctor.averageRating} ratingCount={doctor.reviewCount} writtenReviewCount={doctor.writtenReviewCount} />
  );
}

/** The shared `DoctorCard`, fed from a `GET /public/doctors` row -- used by the homepage, the Find a Doctor page and every specialty page. */
export function PublicDoctorCard({ doctor }: { doctor: PublicDoctor }) {
  const locale = useLocale();
  const specialtyName = pickLocalizedName(doctor.specialtyName, doctor.specialtyNameAr, locale);

  return (
    <DoctorCard
      doctorProfileId={doctor.doctorProfileId}
      fullName={doctor.fullName}
      avatarUrl={doctor.avatarUrl}
      specialtyLabel={specialtyName}
      specialtyName={doctor.specialtyName}
      professionalRank={doctor.professionalRank}
      yearsOfExperience={doctor.yearsOfExperience}
      hospitalName={doctor.hospitalName}
      availability={doctor.availability}
      consultationFeeAmount={doctor.consultationFeeAmount}
      ratingSlot={<PopularDoctorRating doctor={doctor} />}
      // "Top Rated" only for a score the card actually shows (the same MIN_RATING_COUNT_FOR_CONFIDENT_DISPLAY rule):
      // the backend picks it among doctors with any rating, which could crown a "New — 2 ratings" doctor.
      rankBadge={
        doctor.isTopRated && doctor.reviewCount >= MIN_RATING_COUNT_FOR_CONFIDENT_DISPLAY
          ? 'topRated'
          : doctor.isMostBooked
            ? 'mostBooked'
            : null
      }
    />
  );
}
