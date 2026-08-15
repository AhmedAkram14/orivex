'use client';

import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  Flame,
  Headphones,
  Lock,
  MapPin,
  ShieldCheck,
  Star,
  Stethoscope,
  Trophy,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePublicDoctors } from '@/features/landing/hooks/use-public-doctors';
import type { PublicDoctor } from '@/features/landing/api/types';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@/shared/lib/cn';
import { Skeleton } from '@/shared/ui/skeleton';

function initialsOf(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

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

function DoctorCard({ doctor }: { doctor: PublicDoctor }) {
  const t = useTranslations('landing.popularDoctors');
  const locale = useLocale();
  const specialtyName = pickLocalizedName(doctor.specialtyName, doctor.specialtyNameAr, locale);

  return (
    <Card className="relative flex h-full flex-col gap-4 rounded-2xl p-6 pb-4 transition-shadow duration-(--duration-fast) ease-standard hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="size-20">
            <AvatarFallback>{initialsOf(doctor.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-base font-bold text-text-primary">
              {doctor.fullName}
              <Icon
                icon={BadgeCheck}
                size="sm"
                className="shrink-0 text-primary"
                aria-label={t('verified')}
              />
            </span>
            <Badge variant={specialtyBadgeVariant(doctor.specialtyName)} className="w-fit gap-1">
              <Icon icon={Stethoscope} size="xs" />
              {specialtyName}
            </Badge>

            {doctor.reviewCount > 0 ? (
              <div className="flex items-center gap-1.5">
                <Icon icon={Star} size="sm" className="fill-warning text-warning" />
                <span className="text-sm font-bold text-text-primary">
                  {doctor.averageRating?.toFixed(1)}
                </span>
                <span className="text-sm text-text-tertiary">
                  {t('reviewCount', { count: doctor.reviewCount })}
                </span>
              </div>
            ) : (
              <Text size="sm" tone="tertiary">
                {t('noReviewsYet')}
              </Text>
            )}
          </div>
        </div>

        {(doctor.isTopRated || doctor.isMostBooked) && (
          <Badge
            variant={doctor.isTopRated ? 'success' : 'warning'}
            className="absolute top-0 end-0 shrink-0 gap-1 rounded-lg px-2 py-2"
          >
            <Icon icon={doctor.isTopRated ? Trophy : Flame} size="xs" />
            {doctor.isTopRated ? t('topRated') : t('mostBooked')}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-tertiary">
        {doctor.yearsOfExperience !== undefined && (
          <span className="flex items-center gap-1.5">
            <Icon icon={Briefcase} size="xs" />
            {t('yearsExperience', { count: doctor.yearsOfExperience })}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Icon icon={MapPin} size="xs" />
          {doctor.hospitalName ?? t('independentPractice')}
        </span>
        {doctor.availability && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            {doctor.availability === 'today' ? t('availableToday') : t('availableTomorrow')}
          </span>
        )}
      </div>

      <span className="h-px w-full bg-border-default" aria-hidden="true" />

      {doctor.consultationFeeAmount !== undefined && (
        <div className="flex flex-col">
          <span className="text-xs text-text-tertiary">{t('consultationFeeLabel')}</span>
          <span className={cn('text-base font-bold', doctor.consultationFeeAmount === 0 ? 'text-success' : 'text-text-primary')}>
            {doctor.consultationFeeAmount === 0
              ? t('consultationFeeFree')
              : t('consultationFee', { amount: doctor.consultationFeeAmount })}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-8">
        <Link
          href={`/patient/doctors/${doctor.doctorProfileId}`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {t('viewProfile')}
          <Icon icon={ArrowRight} size="sm" flipRtl />
        </Link>
        <Button asChild size="sm" className="flex-1 gap-1.5">
          <Link href={`/patient/appointments/book?doctorId=${doctor.doctorProfileId}`}>
            <Icon icon={CalendarCheck} size="sm" />
            {t('bookAppointment')}
          </Link>
        </Button>
      </div>
    </Card>
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
            <DoctorCard key={doctor.doctorProfileId} doctor={doctor} />
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
