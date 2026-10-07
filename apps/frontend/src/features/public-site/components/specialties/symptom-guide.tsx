import { ArrowRight, Info } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { PublicSpecialty } from '@/features/landing/api/types';
import { SectionHeader } from '@/features/public-site/components/section-header';
import { SYMPTOM_GUIDE } from '@/features/public-site/content/symptom-map';
import { getSpecialtyContentKey } from '@/features/public-site/lib/specialty-content';
import { toSpecialtySlug } from '@/features/public-site/lib/specialty-slug';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';

/** Each symptom links to the real specialty it maps to; symptoms whose specialty isn't offered are left out. */
export function SymptomGuide({ specialties }: { specialties: readonly PublicSpecialty[] }) {
  const t = useTranslations('publicSite.specialtiesPage.symptoms');
  const locale = useLocale();

  const entries = SYMPTOM_GUIDE.flatMap((entry) => {
    const specialty = specialties.find((candidate) => getSpecialtyContentKey(candidate.name) === entry.specialty);
    return specialty ? [{ ...entry, specialty }] : [];
  });

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-(--section-head-gap)">
      <SectionHeader label={t('label')} title={t('title')} subtitle={t('subtitle')} titleId="symptom-guide-title" />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ key, icon, specialty }) => (
          <li key={key}>
            <Link
              href={`/specialties/${toSpecialtySlug(specialty.name)}`}
              className="group flex h-full items-center gap-3 rounded-(--r-card) border border-border-default bg-surface p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <Icon icon={icon} size="md" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold text-text-primary">{t(`items.${key}`)}</span>
                <span className="text-small text-text-secondary">
                  {t('seeSpecialty', { specialty: pickLocalizedName(specialty.name, specialty.nameAr, locale) })}
                </span>
              </span>
              <Icon icon={ArrowRight} size="sm" flipRtl className="shrink-0 text-text-tertiary group-hover:text-primary" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 rounded-md bg-info-subtle p-4 text-small text-info-emphasis">
        <Icon icon={Info} size="sm" className="mt-0.5 shrink-0" />
        <span>{t('disclaimer')}</span>
      </p>
    </div>
  );
}
