'use client';

import { ArrowRight, Stethoscope } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { usePublicSpecialties } from '@/features/landing/hooks/use-public-specialties';
import { Icon } from '@/shared/icons/icon';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { useRouter } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

const ALL_SPECIALTIES_VALUE = 'all';

/**
 * A single compact pill (specialty picker + name field + submit) rather
 * than a bordered form -- rendered inside the Hero, right below the
 * headline. Submits into the real, existing Doctor Directory
 * (`/patient/doctors`), preserving both filters it already understands
 * (`specialty` free-text, `specialtyId` exact) — the same query-param
 * convention `patient/doctors/page.tsx` reads today. The specialty
 * dropdown is populated from the real, live `GET /public/specialties`
 * list, never hardcoded.
 */
export function SearchSection() {
  const t = useTranslations('landing.search');
  const locale = useLocale();
  const router = useRouter();
  const { data: specialties, isLoading } = usePublicSpecialties();
  const [name, setName] = useState('');
  const [specialtyId, setSpecialtyId] = useState<string>(ALL_SPECIALTIES_VALUE);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (name.trim()) query.set('specialty', name.trim());
    if (specialtyId !== ALL_SPECIALTIES_VALUE) query.set('specialtyId', specialtyId);
    const search = query.toString();
    router.push(search ? `/patient/doctors?${search}` : '/patient/doctors');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md items-center gap-2 rounded-full border border-border-default bg-surface p-2 ps-4 shadow-sm"
    >
      <Icon icon={Stethoscope} size="sm" className="shrink-0 text-primary" />

      {isLoading ? (
        <Skeleton className="h-5 w-20 shrink-0" />
      ) : (
        <Select value={specialtyId} onValueChange={setSpecialtyId}>
          <SelectTrigger
            aria-label={t('specialtyLabel')}
            className="h-auto w-auto shrink-0 gap-1 border-0 bg-transparent p-0 text-sm font-medium text-text-primary shadow-none focus:outline-none focus-visible:ring-0"
          >
            <SelectValue placeholder={t('allSpecialties')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SPECIALTIES_VALUE}>{t('allSpecialties')}</SelectItem>
            {specialties?.map((specialty) => (
              <SelectItem key={specialty.id} value={specialty.id}>
                {pickLocalizedName(specialty.name, specialty.nameAr, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <span className="h-6 w-px shrink-0 bg-border-default" aria-hidden="true" />

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t('namePlaceholder')}
        aria-label={t('nameLabel')}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
      />

      <Button type="submit" size="icon" className="shrink-0 rounded-full" aria-label={t('submit')}>
        <Icon icon={ArrowRight} size="sm" flipRtl />
      </Button>
    </form>
  );
}
