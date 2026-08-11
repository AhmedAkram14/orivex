'use client';

import { Layers } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Alert } from '@/shared/ui/alert';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): Browse Specialties
 * -- immediately reachable, no identity-verification gate. Each card links
 * into Browse/Search Doctors pre-filtered to that specialty (`?specialtyId=`).
 */
export function SpecialtyDirectoryBrowser() {
  const t = useTranslations('patient.specialties');
  const locale = useLocale();
  const { data: specialties, isLoading, isError } = useSpecialtiesList();
  const activeSpecialties = specialties?.filter((specialty) => specialty.isActive) ?? [];

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (activeSpecialties.length === 0) {
    return <EmptyState icon={Layers} title={t('emptyTitle')} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {activeSpecialties.map((specialty) => (
        <Link key={specialty.id} href={`/patient/doctors?specialtyId=${specialty.id}`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 pt-6">
              <Layers className="size-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-text-primary">
                {pickLocalizedName(specialty.name, specialty.nameAr, locale)}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
