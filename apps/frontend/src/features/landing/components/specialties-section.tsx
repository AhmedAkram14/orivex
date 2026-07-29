'use client';

import { Stethoscope } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePublicSpecialties } from '@/features/landing/hooks/use-public-specialties';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Real specialties only, each with its real doctor count (from
 * `GET /public/specialties` -- never hardcoded). A specialty with zero
 * doctors today is simply not shown, rather than displayed as a dead-end
 * choice.
 */
export function SpecialtiesSection() {
  const t = useTranslations('landing.specialties');
  const { data: specialties, isLoading } = usePublicSpecialties();
  const visible = specialties?.filter((specialty) => specialty.doctorCount > 0) ?? [];

  return (
    <Container id="specialties" size="lg" className="flex flex-col gap-8 py-16 scroll-mt-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && visible.length === 0 && <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />}

      {!isLoading && visible.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((specialty) => (
            <Link key={specialty.id} href={`/patient/doctors?specialtyId=${specialty.id}`}>
              <Card className="flex h-full flex-col items-center gap-2 p-5 text-center transition-colors hover:border-primary">
                <Icon icon={Stethoscope} size="lg" className="text-primary" />
                <Text className="font-medium">{specialty.name}</Text>
                <Text size="sm" tone="tertiary">
                  {t('doctorCount', { count: specialty.doctorCount })}
                </Text>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
