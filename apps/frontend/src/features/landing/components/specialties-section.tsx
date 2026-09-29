'use client';

import { ArrowRight, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePublicSpecialties } from '@/features/landing/hooks/use-public-specialties';
import type { PublicSpecialty } from '@/features/landing/api/types';
import { Heading, Text } from '@/design-system/typography';
import { Badge } from '@/shared/ui/badge';
import { Carousel, CarouselItem } from '@/shared/ui/carousel';
import { Icon } from '@/shared/icons/icon';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Link } from '@/shared/i18n/navigation';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { getSpecialtyStyle } from '@/shared/lib/specialty-palette';
import { SpecialtyIconTile } from '@/shared/ui/specialty-chip';

function SpecialtyCard({ specialty }: { specialty: PublicSpecialty }) {
  const t = useTranslations('landing.specialties');
  const locale = useLocale();
  // The same icon + hue for the same specialty everywhere (landing, directory, specialties page).
  const style = getSpecialtyStyle(specialty.name);

  return (
    <Link href={`/patient/doctors?specialtyId=${specialty.id}`} className="block h-full">
      <Card className="flex h-full flex-col gap-3 p-5 transition-shadow duration-(--duration-fast) ease-standard hover:shadow-md">
        <SpecialtyIconTile name={specialty.name} size="lg" />
        <Heading as="h3" level={4}>{pickLocalizedName(specialty.name, specialty.nameAr, locale)}</Heading>
        <Text size="sm" tone="secondary" className="grow">
          {t(`categories.${style.key}`)}
        </Text>
        {/* Stacked on every card (count, then the link), so no card wraps into a cramped two-line row. */}
        <div className="flex flex-col items-start gap-1 border-t border-border-default pt-3">
          <span className="text-small whitespace-nowrap text-text-tertiary">{t('doctorCount', { count: specialty.doctorCount })}</span>
          <span className="inline-flex items-center gap-1 text-small font-semibold whitespace-nowrap text-care-text">
            {t('viewDoctors')}
            <Icon icon={ArrowRight} size="sm" flipRtl />
          </span>
        </div>
      </Card>
    </Link>
  );
}

/**
 * Real specialties only, each with its real doctor count (from
 * `GET /public/specialties` -- never hardcoded). A specialty with zero
 * doctors today is simply not shown, rather than displayed as a dead-end
 * choice. The stats bar (specialty count, total verified doctors) is
 * likewise derived from that same real response -- no fabricated
 * "patient satisfaction" style metric the platform has no data for.
 */
export function SpecialtiesSection() {
  const t = useTranslations('landing.specialties');
  const { data: specialties, isLoading } = usePublicSpecialties();
  const visible = specialties?.filter((specialty) => specialty.doctorCount > 0) ?? [];
  const totalDoctors = visible.reduce((sum, specialty) => sum + specialty.doctorCount, 0);

  return (
    <Container id="specialties" size="lg" className="flex flex-col items-center gap-8 py-16 scroll-mt-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
          <Icon icon={ShieldCheck} size="xs" />
          {t('verifiedBadge')}
        </Badge>
        <Heading as="h2" level={2}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>

      {!isLoading && visible.length > 0 && (
        <Card className="flex flex-wrap items-center justify-center gap-6 rounded-2xl px-8 py-4 sm:gap-10">
          <div className="flex items-center gap-2">
            <Icon icon={Stethoscope} size="md" className="text-primary" />
            <span className="text-lg font-bold text-text-primary">{visible.length}+</span>
            <Text size="sm" tone="secondary">
              {t('specialtiesStat')}
            </Text>
          </div>
          <span className="hidden h-8 w-px bg-border-default sm:block" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <Icon icon={Users} size="md" className="text-success" />
            <span className="text-lg font-bold text-text-primary">{totalDoctors}+</span>
            <Text size="sm" tone="secondary">
              {t('doctorsStat')}
            </Text>
          </div>
        </Card>
      )}

      {isLoading && (
        <>
          {/* Mobile: one skeleton card at a time, matching the real carousel's one-card-per-view layout below. */}
          <Carousel className="w-full sm:hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <CarouselItem key={index}>
                <Skeleton className="h-56 w-full" />
              </CarouselItem>
            ))}
          </Carousel>
          <Carousel className="hidden w-full sm:flex">
            {Array.from({ length: 8 }).map((_, index) => (
              <CarouselItem key={index} className="w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)]">
                <Skeleton className="h-56 w-full" />
              </CarouselItem>
            ))}
          </Carousel>
        </>
      )}

      {!isLoading && visible.length === 0 && <EmptyState illustration="search-no-results" title={t('emptyTitle')} description={t('emptyDescription')} />}

      {!isLoading && visible.length > 0 && (
        <>
          {/* Mobile: one card visible at a time, horizontal swipe to the next -- a 2-column grid at this width left every card too cramped to read. */}
          <Carousel className="w-full sm:hidden">
            {visible.map((specialty) => (
              <CarouselItem key={specialty.id}>
                <SpecialtyCard specialty={specialty} />
              </CarouselItem>
            ))}
          </Carousel>
          {/* Tablet/desktop: a wider carousel (3 cards per view on tablet, 4 on
              desktop) instead of a static grid -- with 9+ specialties a full
              grid ran the page on for several extra rows; scrolling through a
              fixed-height row reads better than a long stack. */}
          <Carousel showControls className="hidden w-full sm:flex">
            {visible.map((specialty) => (
              <CarouselItem
                key={specialty.id}
                className="w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)]"
              >
                <SpecialtyCard specialty={specialty} />
              </CarouselItem>
            ))}
          </Carousel>
        </>
      )}
    </Container>
  );
}
