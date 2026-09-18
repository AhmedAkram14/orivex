'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export interface ReportsDateRangePickerProps {
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

// The backend's `reports-analytics`/`reports-export` routes have no "all
// time" sentinel -- `DoctorReportFilterQueryDto` always resolves to two
// concrete ISO dates, defaulting to a trailing 30-day window only when both
// are absent. This preset approximates "all time" with a fixed early
// boundary well before this platform's own launch, rather than sending an
// unsupported "no filter" request.
const ALL_TIME_START_ISO = '2020-01-01';

/** The Reports page's date-range default -- last 30 days ending today, matching `DoctorReportFilterQueryDto.toFilter()`'s own no-params default so the picker's initial value and the backend's own default never disagree. */
export function getLast30DaysRange(): { dateFrom: string; dateTo: string } {
  return { dateFrom: daysAgoIso(30), dateTo: todayIso() };
}

/**
 * Doctor Reports page rebuild (Phase 3): two date inputs + preset shortcuts,
 * mirroring `AnalyticsFiltersBar`'s exact date-input pattern/styling (label +
 * `<Input type="date">`, `w-40`) -- not importing that component itself,
 * which also carries doctor/specialty/payment/verification fields this
 * doctor-scoped page has no use for. Presentational/controlled: the parent
 * (`reports-summary.tsx`) owns the actual URL-synced date state.
 */
export function ReportsDateRangePicker({ dateFrom, dateTo, onChange }: ReportsDateRangePickerProps) {
  const t = useTranslations('doctor.reports.dateRange');

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="reports-date-from" className="text-xs text-text-tertiary">
          {t('from')}
        </label>
        <Input
          id="reports-date-from"
          type="date"
          value={dateFrom}
          onChange={(event) => event.target.value && onChange(event.target.value, dateTo)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reports-date-to" className="text-xs text-text-tertiary">
          {t('to')}
        </label>
        <Input
          id="reports-date-to"
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
