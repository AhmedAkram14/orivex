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
import { useTranslations } from 'next-intl';
import { usePublicDoctors } from '@/features/landing/hooks/use-public-doctors';
import type { PublicDoctor } from '@/features/landing/api/types';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';
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
const SPECIALTY_BADGE_VARIANTS: BadgeProps['variant'][] = ['primary', 'success', 'warning', 'danger'];

function specialtyBadgeVariant(specialtyName: string): BadgeProps['variant'] {
  let hash = 0;
  for (let index = 0; index < specialtyName.length; index += 1) {
    hash = (hash * 31 + specialtyName.charCodeAt(index)) | 0;
  }
  return SPECIALTY_BADGE_VARIANTS[Math.abs(hash) % SPECIALTY_BADGE_VARIANTS.length];
}

function StarRow({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((position) => (
        <Icon
          key={position}
          icon={Star}
          size="sm"
          className={position <= filled ? 'fill-warning text-warning' : 'fill-border-default text-border-default'}
        />
      ))}
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: PublicDoctor }) {
  const t = useTranslations('landing.popularDoctors');

  return (
    <Card className="group flex h-full flex-col gap-5 rounded-3xl border-border-default p-8 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-[250ms] ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar size="lg" className="size-[88px] transition-transform duration-[250ms] ease-out group-hover:scale-[1.03]">
              <AvatarFallback className="text-2xl">{initialsOf(doctor.fullName)}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -end-1 flex size-6 items-center justify-center rounded-full bg-success ring-2 ring-surface">
              <Icon icon={ShieldCheck} size="xs" className="text-success-foreground" />
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-2xl font-bold leading-tight text-text-primary">
              {doctor.fullName}
              <Icon icon={BadgeCheck} size="md" className="shrink-0 text-primary" label={t('verified')} />
            </span>
            <Badge variant={specialtyBadgeVariant(doctor.specialtyName)} className="w-fit gap-1.5 px-3 py-1 text-sm">
              <Icon icon={Stethoscope} size="sm" />
              {doctor.specialtyName}
            </Badge>
          </div>
        </div>

        {(doctor.isTopRated || doctor.isMostBooked) && (
          <Badge variant={doctor.isTopRated ? 'success' : 'warning'} className="shrink-0 gap-1">
            <Icon icon={doctor.isTopRated ? Trophy : Flame} size="xs" />
            {doctor.isTopRated ? t('topRated') : t('mostBooked')}
          </Badge>
        )}
      </div>

      {doctor.reviewCount > 0 ? (
        <div className="flex items-center gap-2">
          <StarRow rating={doctor.averageRating ?? 0} />
          <span className="text-base font-bold text-text-primary">{doctor.averageRating?.toFixed(1)}</span>
          <span className="text-sm text-text-tertiary">{t('reviewCount', { count: doctor.reviewCount })}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-primary">{t('newDoctor')}</span>
          <Text size="sm" tone="tertiary">
            {t('beFirstToReview')}
          </Text>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-sm text-text-tertiary">
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
          <span className="flex items-center gap-1.5 font-medium text-success">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            {doctor.availability === 'today' ? t('availableToday') : t('availableTomorrow')}
          </span>
        )}
      </div>

      <span className="my-1 h-px w-full bg-border-default" aria-hidden="true" />

      {doctor.consultationFeeAmount !== undefined && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-tertiary">{t('consultationFeeLabel')}</span>
          <span className="text-xl font-bold text-text-primary">{t('consultationFee', { amount: doctor.consultationFeeAmount })}</span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3">
        <Link
          href={`/patient/doctors/${doctor.doctorProfileId}`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-text-primary hover:text-primary"
        >
          {t('viewProfile')}
          <Icon icon={ArrowRight} size="sm" flipRtl />
        </Link>
        <Button asChild size="lg" className="h-12 flex-1 gap-1.5 rounded-xl">
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
 * no reviews yet still appears, just last, with an honest "new doctor"
 * label rather than a fabricated rating. The "Top Rated"/"Most Booked"
 * ribbons, years-of-experience, hospital affiliation, and "Available Today/
 * Tomorrow" chip are all real, backend-computed signals (see the same
 * use case) -- never a marketing placeholder. Avatars stay initials-only
 * (no photo field exists anywhere in the schema) and the location slot
 * shows the doctor's real hospital affiliation, or "Independent Practice"
 * when there isn't one -- never a fabricated city, since no such field
 * exists either.
 */
export function PopularDoctorsSection() {
  const t = useTranslations('landing.popularDoctors');
  const { data, isLoading } = usePublicDoctors({ limit: 6 });
  const doctors = data?.doctors ?? [];

  const trustItems = [
    { icon: ShieldCheck, title: t('trust.verified.title'), description: t('trust.verified.description') },
    { icon: Lock, title: t('trust.secureBooking.title'), description: t('trust.secureBooking.description') },
    { icon: CalendarCheck, title: t('trust.available.title'), description: t('trust.available.description') },
    { icon: Headphones, title: t('trust.support.title'), description: t('trust.support.description') },
  ];

  return (
    <Container size="lg" className="relative flex flex-col gap-12 py-20 lg:py-28">
      {/* Decorative dot-grid texture, corners only -- purely ornamental. */}
      <div
        className="pointer-events-none absolute -start-4 top-0 hidden size-32 opacity-40 sm:block"
        style={{ backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -end-4 top-0 hidden size-32 opacity-40 sm:block"
        style={{ backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center gap-4 text-center">
        {/* Decorative blurred glow behind the heading -- existing token color only. */}
        <div
          className="absolute inset-x-0 top-0 -z-10 mx-auto size-72 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />

        <Badge variant="primary" className="gap-1.5 px-3.5 py-1.5 text-xs uppercase tracking-wide">
          <Icon icon={ShieldCheck} size="xs" />
          {t('eyebrow')}
        </Badge>
        <Heading level={1} className="text-4xl font-extrabold sm:text-5xl lg:text-6xl">
          {t('title')}
        </Heading>
        <Text size="lg" tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>

        {!isLoading && doctors.length > 0 && (
          <div className="end-0 top-0 sm:absolute">
            <Button asChild variant="outline" className="h-[52px] rounded-full border px-6">
              <Link href="/patient/doctors">
                {t('viewAllDoctors')}
                <Icon icon={ArrowRight} size="sm" flipRtl />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      )}

      {!isLoading && doctors.length === 0 && (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      )}

      {!isLoading && doctors.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.doctorProfileId} doctor={doctor} />
          ))}
        </div>
      )}

      {!isLoading && doctors.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8 rounded-2xl border border-border-default bg-surface px-8 py-8 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
                <Icon icon={item.icon} size="lg" className="text-primary" />
              </span>
              <div className="flex flex-col text-start">
                <span className="text-base font-bold text-text-primary">{item.title}</span>
                <Text size="sm" tone="tertiary">
                  {item.description}
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
