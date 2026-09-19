'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export interface EarningsDateRangePickerProps {
  /** ISO date (YYYY-MM-DD). Controlled -- this component owns no date state of its own. */
  dateFrom: string;
  /** ISO date (YYYY-MM-DD). */
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toIsoDate(date);
}

function startOfThisMonthIso(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

// Mirrors `ReportsDateRangePicker`'s own sentinel exactly (Doctor Earnings
// page rebuild, Phase 3): `DoctorEarningsFilterQueryDto` has no "all time"
// concept either -- it always resolves to two concrete ISO dates, defaulting
// to a trailing 30-day window only when both are absent. This approximates
// "all time" with the same fixed early boundary, well before this
// platform's own launch, rather than sending an unsupported "no filter"
// request.
const ALL_TIME_START_ISO = '2020-01-01';

/** The Earnings page's date-range default -- last 30 days ending today, matching `DoctorEarningsFilterQueryDto.toFilter()`'s own no-params default so the picker's initial value and the backend's own default never disagree. */
export function getLast30DaysRange(): { dateFrom: string; dateTo: string } {
  return { dateFrom: daysAgoIso(30), dateTo: todayIso() };
}

/**
 * Doctor Earnings page rebuild (Phase 3): own copy of `ReportsDateRangePicker`
 * in `features/payment` rather than importing it from `features/doctor` --
 * mirrors its exact two-date-inputs-plus-presets interaction, per the
 * established doctor-scoped-per-feature convention. Presentational/
 * controlled: the parent (`doctor-earnings-summary.tsx`) owns the actual
 * URL-synced date state.
 */
export function EarningsDateRangePicker({ dateFrom, dateTo, onChange }: EarningsDateRangePickerProps) {
  const t = useTranslations('doctor.earnings.dateRange');

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="earnings-date-from" className="text-xs text-text-tertiary">
          {t('from')}
        </label>
        <Input
          id="earnings-date-from"
          type="date"
          value={dateFrom}
          onChange={(event) => event.target.value && onChange(event.target.value, dateTo)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="earnings-date-to" className="text-xs text-text-tertiary">
          {t('to')}
        </label>
        <Input
          id="earnings-date-to"
          type="date"
          value={dateTo}
          onChange={(event) => event.target.value && onChange(dateFrom, event.target.value)}
          className="w-40"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(daysAgoIso(7), todayIso())}>
          {t('preset7Days')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(daysAgoIso(30), todayIso())}>
          {t('preset30Days')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(daysAgoIso(90), todayIso())}>
          {t('preset90Days')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(startOfThisMonthIso(), todayIso())}>
          {t('presetThisMonth')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(ALL_TIME_START_ISO, todayIso())}>
          {t('presetAllTime')}
        </Button>
      </div>
    </div>
  );
}
