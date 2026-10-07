'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContext, useContext, useDeferredValue, useId, useMemo, useState, type ReactNode } from 'react';
import type { PublicSpecialty } from '@/features/landing/api/types';
import { SpecialtyCard } from '@/features/public-site/components/specialties/specialty-card';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';

interface SpecialtySearchState {
  query: string;
  setQuery: (query: string) => void;
}

const SpecialtySearchContext = createContext<SpecialtySearchState | null>(null);

function useSpecialtySearch(): SpecialtySearchState {
  const value = useContext(SpecialtySearchContext);
  if (!value) throw new Error('useSpecialtySearch must be used inside <SpecialtySearchProvider>.');
  return value;
}

/** Shares the hero's search text with the grid further down the page (two separate sections, one filter). */
export function SpecialtySearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <SpecialtySearchContext.Provider value={value}>{children}</SpecialtySearchContext.Provider>;
}

export function SpecialtySearchInput() {
  const t = useTranslations('publicSite.specialtiesPage.hero');
  const { query, setQuery } = useSpecialtySearch();
  const inputId = useId();

  return (
    <form role="search" className="relative w-full max-w-lg" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor={inputId} className="sr-only">
        {t('searchLabel')}
      </label>
      <Icon icon={Search} size="sm" className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
      <Input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('searchPlaceholder')}
        autoComplete="off"
        className="h-12 rounded-full ps-11 text-base"
        aria-controls="specialty-results"
      />
    </form>
  );
}

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[̀-ًͯ-ْ]/g, '').toLowerCase().trim();
}

/** Matches the query against both the English and the Arabic name, whatever the page locale. */
export function SpecialtyGrid({ specialties }: { specialties: readonly PublicSpecialty[] }) {
  const t = useTranslations('publicSite.specialtiesPage.grid');
  const { query, setQuery } = useSpecialtySearch();
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const needle = normalize(deferredQuery);
    if (!needle) return specialties;
    return specialties.filter((specialty) =>
      [specialty.name, specialty.nameAr ?? ''].some((name) => normalize(name).includes(needle)),
    );
  }, [deferredQuery, specialties]);

  return (
    <div id="specialty-results" className="flex flex-col gap-4">
      <p aria-live="polite" className="text-small text-text-tertiary">
        {deferredQuery ? t('resultsFor', { count: results.length, query: deferredQuery }) : t('resultsAll', { count: results.length })}
      </p>
      {results.length === 0 ? (
        <EmptyState
          illustration="search-no-results"
          title={t('noMatchTitle')}
          description={t('noMatchDescription')}
          action={
            <Button variant="secondary" onClick={() => setQuery('')}>
              {t('clearSearch')}
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((specialty) => (
            <li key={specialty.id}>
              <SpecialtyCard specialty={specialty} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

