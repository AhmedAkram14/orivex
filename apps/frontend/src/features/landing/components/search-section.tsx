'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { usePublicSpecialties } from '@/features/landing/hooks/use-public-specialties';
import { Icon } from '@/shared/icons/icon';
import { useRouter } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

const ALL_SPECIALTIES_VALUE = 'all';

/**
 * Submits into the real, existing Doctor Directory (`/patient/doctors`),
 * preserving both filters it already understands (`specialty` free-text,
 * `specialtyId` exact) — the same query-param convention
 * `patient/doctors/page.tsx` reads today. The specialty dropdown is
 * populated from the real, live `GET /public/specialties` list, never
 * hardcoded.
 */
export function SearchSection() {
  const t = useTranslations('landing.search');
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
    <Container size="lg" className="-mt-10 pb-16">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4 shadow-lg sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-2">
          <Icon icon={Search} size="md" className="shrink-0 text-text-tertiary" />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('namePlaceholder')}
            aria-label={t('nameLabel')}
          />
        </div>
        <div className="sm:w-56">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={specialtyId} onValueChange={setSpecialtyId}>
              <SelectTrigger aria-label={t('specialtyLabel')}>
                <SelectValue placeholder={t('specialtyPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SPECIALTIES_VALUE}>{t('allSpecialties')}</SelectItem>
                {specialties?.map((specialty) => (
                  <SelectItem key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button type="submit" size="lg">
          {t('submit')}
        </Button>
      </form>
    </Container>
  );
}
