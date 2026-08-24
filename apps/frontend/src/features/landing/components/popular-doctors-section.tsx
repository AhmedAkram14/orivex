'use client';

import { ArrowRight, CalendarCheck, Headphones, Lock, ShieldCheck, Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePublicDoctors } from '@/features/landing/hooks/use-public-doctors';
import type { PublicDoctor } from '@/features/landing/api/types';
import { DoctorCard } from '@/features/doctor/components/doctor-card';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

// Purely cosmetic pill color per specialty -- unlike Browse Specialties'
// hand-picked category mapping, this card only needs neighbors in a 3-column
// grid to not all match, so a name-hash over the same 4 distinct hues this
// design system actually has (see specialties-section.tsx's own comment on
// the info/primary token duplicate) is enough.
const SPECIALTY_BADGE_VARIANTS: BadgeProps['variant'][] = [
  'primary',
  'success',
  'warning',
  'danger',
];

function specialtyBadgeVariant(specialtyName: string): BadgeProps['variant'] {
  let hash = 0;
  for (let index = 0; index < specialtyName.length; index += 1) {
    hash = (hash * 31 + specialtyName.charCodeAt(index)) | 0;
  }
  return SPECIALTY_BADGE_VARIANTS[Math.abs(hash) % SPECIALTY_BADGE_VARIANTS.length];
}

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
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span className="flex items-center gap-1.5">
        <Icon icon={Star} size="sm" className="fill-warning text-warning" />
        <span className="text-sm font-bold text-text-primary">{doctor.averageRating?.toFixed(1)}</span>
        <span className="text-sm text-text-tertiary">{t('reviewCount', { count: doctor.reviewCount })}</span>
      </span>
      {doctor.writtenReviewCount > 0 && (
        <span className="text-sm text-text-tertiary">· {t('writtenReviewCount', { count: doctor.writtenReviewCount })}</span>
      )}
    </div>
  );
}

function LandingDoctorCard({ doctor }: { doctor: PublicDoctor }) {
  const locale = useLocale();
  const specialtyName = pickLocalizedName(doctor.specialtyName, doctor.specialtyNameAr, locale);

  return (
    <DoctorCard
      doctorProfileId={doctor.doctorProfileId}
      fullName={doctor.fullName}
      avatarUrl={doctor.avatarUrl}
      specialtyLabel={specialtyName}
      specialtyBadgeVariant={specialtyBadgeVariant(doctor.specialtyName)}
      professionalRank={doctor.professionalRank}
      yearsOfExperience={doctor.yearsOfExperience}
      hospitalName={doctor.hospitalName}
      availability={doctor.availability}
      consultationFeeAmount={doctor.consultationFeeAmount}
      ratingSlot={<PopularDoctorRating doctor={doctor} />}
      rankBadge={doctor.isTopRated ? 'topRated' : doctor.isMostBooked ? 'mostBooked' : null}
    />
  );
}

/**
 * Real doctors only, from `GET /public/doctors` -- never hardcoded. Ranked
 * by real rating where one exists (see ListPublicDoctorsUseCase's own
 * comment on the honest, page-local scope of that ranking); a doctor with
 * no reviews yet still appears, just last, with an honest "no reviews yet"
 * label rather than a fabricated rating. The "Top Rated"/"Most Booked"
 * ribbons, years-of-experience, hospital affiliation, and "Available Today/
 * Tomorrow" chip are all real, backend-computed signals (see the same
 * use case) -- never a marketing placeholder.
 */
export function PopularDoctorsSection() {
  const t = useTranslations('landing.popularDoctors');
  const { data, isLoading } = usePublicDoctors({ limit: 6 });
  const doctors = data?.doctors ?? [];

  const trustItems = [
    {
      icon: ShieldCheck,
      title: t('trust.verified.title'),
      description: t('trust.verified.description'),
    },
    {
      icon: Lock,
      title: t('trust.secureBooking.title'),
      description: t('trust.secureBooking.description'),
    },
    {
      icon: CalendarCheck,
      title: t('trust.available.title'),
      description: t('trust.available.description'),
    },
    {
      icon: Headphones,
      title: t('trust.support.title'),
      description: t('trust.support.description'),
    },
  ];

  return (
    <Container size="lg" className="flex flex-col gap-8 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
          <Icon icon={ShieldCheck} size="xs" />
          {t('eyebrow')}
        </Badge>
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>

      {!isLoading && doctors.length > 0 && (
        <div className="flex justify-center sm:justify-end">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-border-default px-5.5 py-4.5 text-primary"
          >
            <Link href="/patient/doctors">
              {t('viewAllDoctors')}
              <Icon icon={ArrowRight} size="sm" flipRtl />
            </Link>
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      )}

      {!isLoading && doctors.length === 0 && (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      )}

      {!isLoading && doctors.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <LandingDoctorCard key={doctor.doctorProfileId} doctor={doctor} />
          ))}
        </div>
      )}

      {!isLoading && doctors.length > 0 && (
        <Card className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 rounded-2xl px-8 py-6">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
                <Icon icon={item.icon} size="md" className="text-primary" />
              </span>
              <div className="flex flex-col text-start">
                <span className="text-sm font-semibold text-text-primary">{item.title}</span>
                <Text size="sm" tone="tertiary">
                  {item.description}
                </Text>
              </div>
            </div>
          ))}
        </Card>
      )}
    </Container>
  );
}
