'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePublicDoctors } from '@/features/landing/hooks/use-public-doctors';
import type { PublicDoctor } from '@/features/landing/api/types';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
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

function DoctorCard({ doctor }: { doctor: PublicDoctor }) {
  const t = useTranslations('landing.popularDoctors');

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>{initialsOf(doctor.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <Text className="font-semibold">{doctor.fullName}</Text>
          <Text size="sm" tone="secondary">
            {doctor.specialtyName}
          </Text>
        </div>
      </div>

      {doctor.professionalRank && (
        <Text size="sm" tone="tertiary" className="capitalize">
          {t(`ranks.${doctor.professionalRank}`)}
        </Text>
      )}

      {doctor.reviewCount > 0 ? (
        <div className="flex items-center gap-1">
          <Icon icon={Star} size="sm" className="fill-warning text-warning" />
          <span className="text-sm font-medium text-text-primary">{doctor.averageRating?.toFixed(1)}</span>
          <span className="text-sm text-text-tertiary">{t('reviewCount', { count: doctor.reviewCount })}</span>
        </div>
      ) : (
        <Text size="sm" tone="tertiary">
          {t('noReviewsYet')}
        </Text>
      )}

      {doctor.consultationFeeAmount !== undefined && (
        <Text size="sm" tone="secondary">
          {t('consultationFee', { amount: doctor.consultationFeeAmount })}
        </Text>
      )}

      <div className="mt-auto flex gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/patient/doctors/${doctor.doctorProfileId}`}>{t('viewProfile')}</Link>
        </Button>
        <Button asChild size="sm" className="flex-1">
          <Link href={`/patient/appointments/book?doctorId=${doctor.doctorProfileId}`}>{t('bookAppointment')}</Link>
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
 * label rather than a fabricated rating.
 */
export function PopularDoctorsSection() {
  const t = useTranslations('landing.popularDoctors');
  const { data, isLoading } = usePublicDoctors({ limit: 6 });
  const doctors = data?.doctors ?? [];

  return (
    <Container size="lg" className="flex flex-col gap-8 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>

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
    </Container>
  );
}
