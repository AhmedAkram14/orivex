'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export interface LoginHistoryDateRangePickerProps {
  /** ISO date (YYYY-MM-DD), or undefined for "no lower bound". Controlled -- no date state of its own, mirroring ReportsDateRangePicker's pattern. */
  from: string | undefined;
  to: string | undefined;
  onChange: (from: string | undefined, to: string | undefined) => void;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toIsoDate(date);
}

/** Login history has no fixed backend default window (unlike Reports' trailing-30-days) -- both fields empty means "no date filter at all", not a hidden preset. */
export function LoginHistoryDateRangePicker({ from, to, onChange }: LoginHistoryDateRangePickerProps) {
  const t = useTranslations('auth.securityCenter.loginHistory.dateRange');

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="login-history-date-from" className="text-xs text-text-tertiary">
          {t('from')}
        </label>
        <Input
          id="login-history-date-from"
          type="date"
          value={from ?? ''}
          onChange={(event) => onChange(event.target.value || undefined, to)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="login-history-date-to" className="text-xs text-text-tertiary">
          {t('to')}
        </label>
        <Input
          id="login-history-date-to"
          type="date"
          value={to ?? ''}
          onChange={(event) => onChange(from, event.target.value || undefined)}
          className="w-40"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(daysAgoIso(7), undefined)}>
          {t('preset7Days')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(daysAgoIso(30), undefined)}>
          {t('preset30Days')}
        </Button>
        {(from || to) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined, undefined)}>
            {t('clear')}
          </Button>
        )}
      </div>
    </div>
  );
}
