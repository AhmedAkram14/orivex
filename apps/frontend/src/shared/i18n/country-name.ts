'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

/** What a country record needs for its name: the name on record and its ISO 3166-1 alpha-2 code. */
export interface NamedCountry {
  name: string;
  iso2Code?: string;
}

/**
 * A country's name in the current language. Countries carry one (English) `name` and their ISO code, so a
 * non-English locale takes the name from the browser's own region names (`Intl.DisplayNames`: EG -> "مصر"),
 * falling back to `name` when the runtime has none. English keeps the name on record.
 */
export function useCountryName(): (country: NamedCountry) => string {
  const locale = useLocale();
  const regions = useMemo(() => {
    if (locale === 'en' || typeof Intl.DisplayNames !== 'function') return undefined;
    try {
      return new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' });
    } catch {
      return undefined;
    }
  }, [locale]);
  return (country) => {
    if (!regions || !country.iso2Code) return country.name;
    try {
      return regions.of(country.iso2Code.toUpperCase()) ?? country.name;
    } catch {
      return country.name;
    }
  };
}
