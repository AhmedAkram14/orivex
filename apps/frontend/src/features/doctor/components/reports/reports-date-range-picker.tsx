'use client';

import { CalendarRange } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { SegmentedControl } from '@/shared/ui/segmented-control';

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
  const format = useFormatter();

  // Highlight whichever preset (if any) matches the current range, computed
  // fresh each render from "today". No match = a custom range.
  const presets = [
    { key: 'preset7Days', dateFrom: daysAgoIso(7), dateTo: todayIso() },
    { key: 'preset30Days', dateFrom: daysAgoIso(30), dateTo: todayIso() },
    { key: 'preset90Days', dateFrom: daysAgoIso(90), dateTo: todayIso() },
    { key: 'presetThisMonth', dateFrom: startOfThisMonthIso(), dateTo: todayIso() },
    { key: 'presetAllTime', dateFrom: ALL_TIME_START_ISO, dateTo: todayIso() },
  ] as const;
  type PresetKey = (typeof presets)[number]['key'];
  const activePresetKey = presets.find((preset) => preset.dateFrom === dateFrom && preset.dateTo === dateTo)?.key;
  const rangeLabel = `${format.dateTime(new Date(`${dateFrom}T00:00:00`), { dateStyle: 'medium' })} – ${format.dateTime(new Date(`${dateTo}T00:00:00`), { dateStyle: 'medium' })}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl<PresetKey>
        ariaLabel={t('custom')}
        options={presets.map((preset) => ({ value: preset.key, label: t(preset.key) }))}
        value={activePresetKey}
        onChange={(key) => {
          const preset = presets.find((item) => item.key === key);
          if (preset) onChange(preset.dateFrom, preset.dateTo);
        }}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="secondary" size="sm" aria-pressed={!activePresetKey}>
            <Icon icon={CalendarRange} size="sm" />
            <span dir="auto">{activePresetKey ? t('custom') : rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-auto flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="reports-date-from" className="text-caption text-text-tertiary">
              {t('from')}
            </label>
            <Input
              id="reports-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => event.target.value && onChange(event.target.value, dateTo)}
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="reports-date-to" className="text-caption text-text-tertiary">
              {t('to')}
            </label>
            <Input
              id="reports-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => event.target.value && onChange(dateFrom, event.target.value)}
              className="w-44"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
