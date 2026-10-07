import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import type { PublicSpecialty } from '@/features/landing/api/types';
import { getSpecialtyContentKey } from '@/features/public-site/lib/specialty-content';
import { toSpecialtySlug } from '@/features/public-site/lib/specialty-slug';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { SpecialtyIconTile } from '@/shared/ui/specialty-chip';

/**
 * One specialty on the index and in "related specialties". Hook-only (no
 * `'use client'`), so it renders inside both the server-rendered related list
 * and the client-filtered index grid.
 */
export function SpecialtyCard({ specialty }: { specialty: PublicSpecialty }) {
  const t = useTranslations('publicSite');
  const locale = useLocale();
  const name = pickLocalizedName(specialty.name, specialty.nameAr, locale);

  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <SpecialtyIconTile name={specialty.name} size="lg" />
      <Heading as="h3" level={4}>
        {name}
      </Heading>
      <Text size="sm" tone="secondary" className="grow">
        {t(`specialtyContent.${getSpecialtyContentKey(specialty.name)}.summary`)}
      </Text>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-3">
        <span className="text-small whitespace-nowrap text-text-tertiary">
          {specialty.doctorCount > 0 ? t('common.doctorCount', { count: specialty.doctorCount }) : t('common.noDoctorsYet')}
        </span>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/specialties/${toSpecialtySlug(specialty.name)}`}>
            {t('common.viewDoctors')}
            <span className="sr-only">: {name}</span>
            <Icon icon={ArrowRight} size="sm" flipRtl />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
