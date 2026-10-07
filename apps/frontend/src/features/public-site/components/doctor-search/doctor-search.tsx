'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { landingApi } from '@/features/landing/api/landing-api';
import type { PublicDoctorListResult, PublicSpecialty } from '@/features/landing/api/types';
import { PublicDoctorCard } from '@/features/landing/components/public-doctor-card';
import { landingDoctorsKeys } from '@/features/landing/hooks/query-keys';
import { DoctorGridSkeleton } from '@/features/public-site/components/doctor-search/doctor-card-skeleton';
import type { DoctorFilterField } from '@/features/public-site/components/doctor-search/doctor-filter-panel';
import { DoctorFilterSheetButton, DoctorFilterSidebar } from '@/features/public-site/components/doctor-search/doctor-filter-sidebar';
import { useDoctorSearch } from '@/features/public-site/components/doctor-search/use-doctor-search';
import {
  countActiveFilters,
  DOCTOR_SORTS,
  serializeDoctorSearch,
  toPublicDoctorQuery,
  type DoctorSearchState,
} from '@/features/public-site/lib/doctor-search-params';
import { findSpecialtyBySlug } from '@/features/public-site/lib/specialty-slug';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import { Pagination } from '@/shared/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

function NameSearch({ value, onCommit }: { value?: string; onCommit: (q: string | undefined) => void }) {
  const t = useTranslations('publicSite.doctorSearch');
  const id = useId();
  const [text, setText] = useState(value ?? '');

  useEffect(() => setText(value ?? ''), [value]);

  useEffect(() => {
    const next = text.trim() || undefined;
    if (next === value) return;
    const timer = setTimeout(() => onCommit(next), 350);
    return () => clearTimeout(timer);
  }, [text, value, onCommit]);

  return (
    <form role="search" className="relative min-w-0 basis-full sm:basis-0 sm:flex-1" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor={id} className="sr-only">
        {t('nameSearchLabel')}
      </label>
      <Icon icon={Search} size="sm" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
      <Input id={id} type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder={t('nameSearchPlaceholder')} className="ps-9" autoComplete="off" />
    </form>
  );
}

export interface DoctorSearchProps {
  fields: readonly DoctorFilterField[];
  /** Every specialty -- feeds the specialty filter and resolves `?specialty=<slug>`. */
  specialties?: readonly PublicSpecialty[];
  /** A specialty page's own specialty: always applied, never offered as a filter. */
  fixedSpecialtyId?: string;
  showNameSearch?: boolean;
  /** The server-rendered first page for the unfiltered URL, so crawlers and first paint see real doctors. */
  initialData?: PublicDoctorListResult | null;
  /** Shown instead of the generic empty state when there are no doctors at all (nothing filtered). */
  emptyState?: ReactNode;
}

/**
 * Filters + sort + paginated results, all driven by the URL (shareable).
 * Results are fetched client-side from `GET /public/doctors` as filters
 * change, keeping the previous page on screen while the next one loads.
 */
export function DoctorSearch({ fields, specialties = [], fixedSpecialtyId, showNameSearch = false, initialData, emptyState }: DoctorSearchProps) {
  const t = useTranslations('publicSite.doctorSearch');
  const { state, update, clear, isPending } = useDoctorSearch();
  const resultsRef = useRef<HTMLDivElement>(null);

  const specialtyId = fixedSpecialtyId ?? (state.specialty ? findSpecialtyBySlug(specialties, state.specialty)?.id : undefined);
  const query = toPublicDoctorQuery(state, specialtyId);
  const isUnfiltered = serializeDoctorSearch(state) === '';

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: landingDoctorsKeys.list(query),
    queryFn: () => landingApi.getDoctors(query),
    initialData: isUnfiltered && initialData ? initialData : undefined,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const includeSpecialty = fields.includes('specialty');
  const activeCount = countActiveFilters(state, { includeSpecialty });
  const hasNarrowing = activeCount > 0 || Boolean(state.q);
  const clearAll = () => clear(includeSpecialty ? {} : { specialty: state.specialty });
  const panelProps = { fields, state, onChange: (patch: Partial<DoctorSearchState>) => update(patch), specialties, activeCount, onClear: clearAll };

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (query.limit ?? 1)));

  const goToPage = (page: number) => {
    update({ page });
    resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <DoctorFilterSidebar {...panelProps} />

      <div ref={resultsRef} className="flex min-w-0 scroll-mt-28 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {showNameSearch && <NameSearch value={state.q} onCommit={(q) => update({ q })} />}
          <DoctorFilterSheetButton {...panelProps} />
          <div className={cn('flex items-center gap-2', !showNameSearch && 'ms-auto')}>
            <Select value={query.sort} onValueChange={(sort) => update({ sort: sort as DoctorSearchState['sort'] })}>
              <SelectTrigger aria-label={t('sortLabel')} className="w-52 max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCTOR_SORTS.map((sort) => (
                  <SelectItem key={sort} value={sort}>
                    {t(`sorts.${sort}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p aria-live="polite" className="text-small text-text-tertiary">
          {data ? t('resultsCount', { count: total }) : ' '}
        </p>

        <div aria-busy={isFetching || isPending} className={cn('transition-opacity', (isFetching || isPending) && data && 'opacity-60')}>
          {isLoading && !data ? (
            <DoctorGridSkeleton />
          ) : isError && !data ? (
            <ErrorState title={t('errorTitle')} description={t('errorDescription')} onRetry={() => void refetch()} />
          ) : total === 0 ? (
            !hasNarrowing && emptyState ? (
              emptyState
            ) : (
              <EmptyState
                illustration="search-no-results"
                title={t('noMatchTitle')}
                description={t('noMatchDescription')}
                action={
                  <Button variant="secondary" onClick={clearAll}>
                    {t('filters.clearAll')}
                  </Button>
                }
              />
            )
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data?.doctors.map((doctor) => (
                <li key={doctor.doctorProfileId}>
                  <PublicDoctorCard doctor={doctor} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {pageCount > 1 && <Pagination page={query.page ?? 1} pageCount={pageCount} onPageChange={goToPage} className="pt-2" />}
      </div>
    </div>
  );
}
