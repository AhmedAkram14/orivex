'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState, type ReactNode } from 'react';
import type { PublicSpecialty } from '@/features/landing/api/types';
import {
  FEE_SLIDER,
  FILTERABLE_RANKS,
  MIN_RATING_OPTIONS,
  MIN_YEARS_OPTIONS,
  type DoctorSearchState,
} from '@/features/public-site/lib/doctor-search-params';
import { toSpecialtySlug } from '@/features/public-site/lib/specialty-slug';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Checkbox } from '@/shared/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export type DoctorFilterField = 'specialty' | 'availability' | 'fee' | 'experience' | 'rank' | 'rating' | 'practice';

const ANY = 'any';

function FilterGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-b border-border-default pb-5 last:border-b-0 last:pb-0">
      <legend className="mb-3 text-small font-semibold text-text-primary">{legend}</legend>
      {children}
    </fieldset>
  );
}

function RadioOptions<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const baseId = useId();
  return (
    <RadioGroup value={value} onValueChange={(next) => onChange(next as T)} aria-label={name} className="flex flex-col gap-2">
      {options.map((option) => (
        <label key={option.value} htmlFor={`${baseId}-${option.value}`} className="flex cursor-pointer items-center gap-2.5 text-small text-text-secondary">
          <RadioGroupItem id={`${baseId}-${option.value}`} value={option.value} />
          {option.label}
        </label>
      ))}
    </RadioGroup>
  );
}

/**
 * Two native range inputs (min and max): keyboard- and screen-reader-
 * accessible with no new dependency. The URL is only written once the
 * visitor stops moving the thumb, not on every step.
 */
function FeeRangeFilter({ minFee, maxFee, onCommit }: { minFee?: number; maxFee?: number; onCommit: (range: { minFee?: number; maxFee?: number }) => void }) {
  const t = useTranslations('publicSite.doctorSearch.filters');
  const format = useFormatter();
  const id = useId();
  const [range, setRange] = useState({ min: minFee ?? FEE_SLIDER.min, max: maxFee ?? FEE_SLIDER.max });

  useEffect(() => setRange({ min: minFee ?? FEE_SLIDER.min, max: maxFee ?? FEE_SLIDER.max }), [minFee, maxFee]);

  useEffect(() => {
    const nextMin = range.min > FEE_SLIDER.min ? range.min : undefined;
    const nextMax = range.max < FEE_SLIDER.max ? range.max : undefined;
    if (nextMin === minFee && nextMax === maxFee) return;
    const timer = setTimeout(() => onCommit({ minFee: nextMin, maxFee: nextMax }), 400);
    return () => clearTimeout(timer);
  }, [range, minFee, maxFee, onCommit]);

  // Whole pounds: the slider moves in 50 EGP steps, so decimals would only add noise.
  const money = (amount: number) => format.number(amount, { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 });
  const maxLabel = range.max >= FEE_SLIDER.max ? t('feeAnyMax', { amount: money(FEE_SLIDER.max) }) : money(range.max);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-text-secondary" aria-live="polite">
        {money(range.min)} – {maxLabel}
      </p>
      <label htmlFor={`${id}-min`} className="flex flex-col gap-1 text-caption text-text-tertiary">
        {t('feeMin')}
        <input
          id={`${id}-min`}
          type="range"
          min={FEE_SLIDER.min}
          max={FEE_SLIDER.max}
          step={FEE_SLIDER.step}
          value={range.min}
          aria-valuetext={money(range.min)}
          onChange={(event) => setRange((current) => ({ ...current, min: Math.min(Number(event.target.value), current.max) }))}
          className="w-full accent-(--color-primary)"
        />
      </label>
      <label htmlFor={`${id}-max`} className="flex flex-col gap-1 text-caption text-text-tertiary">
        {t('feeMax')}
        <input
          id={`${id}-max`}
          type="range"
          min={FEE_SLIDER.min}
          max={FEE_SLIDER.max}
          step={FEE_SLIDER.step}
          value={range.max}
          aria-valuetext={maxLabel}
          onChange={(event) => setRange((current) => ({ ...current, max: Math.max(Number(event.target.value), current.min) }))}
          className="w-full accent-(--color-primary)"
        />
      </label>
    </div>
  );
}

export interface DoctorFilterPanelProps {
  fields: readonly DoctorFilterField[];
  state: DoctorSearchState;
  onChange: (patch: Partial<DoctorSearchState>) => void;
  /** Required when `fields` includes `specialty`. */
  specialties?: readonly PublicSpecialty[];
}

/** The filter controls, shared by the desktop sidebar and the mobile bottom sheet. */
export function DoctorFilterPanel({ fields, state, onChange, specialties = [] }: DoctorFilterPanelProps) {
  const t = useTranslations('publicSite.doctorSearch.filters');
  const locale = useLocale();
  const has = (field: DoctorFilterField) => fields.includes(field);

  return (
    <div className="flex flex-col gap-5">
      {has('specialty') && (
        <FilterGroup legend={t('specialty')}>
          <Select value={state.specialty ?? ANY} onValueChange={(value) => onChange({ specialty: value === ANY ? undefined : value })}>
            <SelectTrigger aria-label={t('specialty')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t('allSpecialties')}</SelectItem>
              {specialties.map((specialty) => (
                <SelectItem key={specialty.id} value={toSpecialtySlug(specialty.name)}>
                  {pickLocalizedName(specialty.name, specialty.nameAr, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterGroup>
      )}

      {has('availability') && (
        <FilterGroup legend={t('availability')}>
          <RadioOptions
            name={t('availability')}
            value={state.availability ?? ANY}
            options={[
              { value: ANY, label: t('anyTime') },
              { value: 'today', label: t('availableToday') },
              { value: 'week', label: t('availableThisWeek') },
            ]}
            onChange={(value) => onChange({ availability: value === ANY ? undefined : (value as 'today' | 'week') })}
          />
        </FilterGroup>
      )}

      {has('fee') && (
        <FilterGroup legend={t('fee')}>
          <FeeRangeFilter minFee={state.minFee} maxFee={state.maxFee} onCommit={(range) => onChange(range)} />
        </FilterGroup>
      )}

      {has('experience') && (
        <FilterGroup legend={t('experience')}>
          <RadioOptions
            name={t('experience')}
            value={state.minYears !== undefined ? String(state.minYears) : ANY}
            options={[{ value: ANY, label: t('anyExperience') }, ...MIN_YEARS_OPTIONS.map((years) => ({ value: String(years), label: t('yearsPlus', { years }) }))]}
            onChange={(value) => onChange({ minYears: value === ANY ? undefined : Number(value) })}
          />
        </FilterGroup>
      )}

      {has('rank') && (
        <FilterGroup legend={t('rank')}>
          <div className="flex flex-col gap-2">
            {FILTERABLE_RANKS.map((rank) => {
              const checked = state.ranks?.includes(rank) ?? false;
              return (
                <label key={rank} className="flex cursor-pointer items-center gap-2.5 text-small text-text-secondary">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => {
                      const ranks = next ? [...(state.ranks ?? []), rank] : (state.ranks ?? []).filter((item) => item !== rank);
                      onChange({ ranks: ranks.length ? ranks : undefined });
                    }}
                  />
                  {t(`ranks.${rank}`)}
                </label>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {has('rating') && (
        <FilterGroup legend={t('rating')}>
          <RadioOptions
            name={t('rating')}
            value={state.minRating !== undefined ? String(state.minRating) : ANY}
            options={[{ value: ANY, label: t('anyRating') }, ...MIN_RATING_OPTIONS.map((rating) => ({ value: String(rating), label: t('ratingPlus', { rating }) }))]}
            onChange={(value) => onChange({ minRating: value === ANY ? undefined : Number(value) })}
          />
        </FilterGroup>
      )}

      {has('practice') && (
        <FilterGroup legend={t('practice')}>
          <RadioOptions
            name={t('practice')}
            value={state.practice ?? ANY}
            options={[
              { value: ANY, label: t('anyPractice') },
              { value: 'hospital', label: t('hospital') },
              { value: 'independent', label: t('independent') },
            ]}
            onChange={(value) => onChange({ practice: value === ANY ? undefined : (value as 'hospital' | 'independent') })}
          />
        </FilterGroup>
      )}
    </div>
  );
}
