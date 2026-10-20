'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import type { AnalyticsPreferences, RefreshInterval } from '@/features/reporting/lib/analytics-preferences';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Icon } from '@/shared/icons/icon';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Sheet } from '@/shared/ui/side-panel';
import { cairoYear } from '@/shared/lib/date/iso-date';
import { DateField, filterDate } from '@/shared/ui/date-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';

function Label({ htmlFor, id, children }: { htmlFor: string; id?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} id={id} className="text-xs text-text-tertiary">
      {children}
    </label>
  );
}

export interface AnalyticsFiltersBarProps {
  preferences: AnalyticsPreferences;
  onChange: (patch: Partial<AnalyticsPreferences>) => void;
}

const REFRESH_OPTIONS: RefreshInterval[] = ['off', 30, 60, 300];

/**
 * The one filter row every analytics section reads from (Date Range,
 * Doctor, Specialty, Consultation Type, Payment Status, Verification
 * Status, Compare Periods, Live Refresh) -- built once here, not
 * per-section, per the "reusable filters" requirement. Doctor is a plain
 * ID field rather than a searchable picker: no admin-facing "list doctors
 * with their DoctorProfile id" endpoint exists yet to back one (the
 * Users table exposes Account ids, not DoctorProfile ids) -- disclosed as
 * a known simplification, not silently dropped (the `doctorId` filter
 * itself is fully wired end-to-end on every backend route).
 */
export function AnalyticsFiltersBar({ preferences, onChange }: AnalyticsFiltersBarProps) {
  const t = useTranslations('admin.analytics.filters');
  const [open, setOpen] = useState(false);
  const activeCount = [
    preferences.dateFrom,
    preferences.dateTo,
    preferences.doctorId,
    preferences.specialtyId,
    preferences.consultationType,
    preferences.paymentStatus,
    preferences.verificationStatus,
    preferences.comparePrevious,
  ].filter(Boolean).length;

  return (
    <>
      <div className="hidden md:block">
        <FilterFields preferences={preferences} onChange={onChange} idPrefix="analytics" />
      </div>
      {/* On a phone the nine controls took ~1.5 screens before any figure; they move into a bottom sheet. */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <Sheet.Trigger asChild>
            <Button type="button" variant="secondary" className="w-full justify-between">
              <span className="inline-flex items-center gap-2">
                <Icon icon={SlidersHorizontal} size="sm" />
                {t('title')}
              </span>
              {activeCount > 0 && <Badge variant="info">{t('activeCount', { count: activeCount })}</Badge>}
            </Button>
          </Sheet.Trigger>
          <Sheet.Content className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-2xl">
            <Sheet.Header>
              <Sheet.Title className="text-h3 text-text-primary">{t('title')}</Sheet.Title>
            </Sheet.Header>
            <FilterFields preferences={preferences} onChange={onChange} idPrefix="analytics-sheet" stacked />
            <Sheet.Footer className="mt-0">
              <Sheet.Close asChild>
                <Button type="button" className="w-full">
                  {t('done')}
                </Button>
              </Sheet.Close>
            </Sheet.Footer>
          </Sheet.Content>
        </Sheet>
      </div>
    </>
  );
}

function FilterFields({
  preferences,
  onChange,
  idPrefix,
  stacked = false,
}: AnalyticsFiltersBarProps & { idPrefix: string; stacked?: boolean }) {
  const t = useTranslations('admin.analytics.filters');
  const locale = useLocale();
  const { data: specialties } = useSpecialtiesList();

  return (
    <div className={stacked ? 'flex flex-col gap-4' : 'flex flex-wrap items-end gap-4 rounded-lg border border-border-default bg-surface p-4'}>
      <div className="flex flex-col gap-1">
        <Label id={`${idPrefix}-date-from-label`} htmlFor={`${idPrefix}-date-from`}>
          {t('dateFrom')}
        </Label>
        <DateField
          id={`${idPrefix}-date-from`}
          labelledBy={`${idPrefix}-date-from-label`}
          value={preferences.dateFrom ?? ''}
          onChange={(value) => filterDate(value, (date) => onChange({ dateFrom: date }))}
          fromYear={2020}
          toYear={cairoYear()}
          className={stacked ? 'w-full' : 'w-72'}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label id={`${idPrefix}-date-to-label`} htmlFor={`${idPrefix}-date-to`}>
          {t('dateTo')}
        </Label>
        <DateField
          id={`${idPrefix}-date-to`}
          labelledBy={`${idPrefix}-date-to-label`}
          value={preferences.dateTo ?? ''}
          onChange={(value) => filterDate(value, (date) => onChange({ dateTo: date }))}
          fromYear={2020}
          toYear={cairoYear()}
          className={stacked ? 'w-full' : 'w-72'}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-doctor-id`}>{t('doctorId')}</Label>
        <Input
          id={`${idPrefix}-doctor-id`}
          value={preferences.doctorId ?? ''}
          onChange={(event) => onChange({ doctorId: event.target.value || undefined })}
          placeholder={t('doctorIdPlaceholder')}
          className={stacked ? 'w-full' : 'w-56'}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-specialty`}>{t('specialty')}</Label>
        <Select
          value={preferences.specialtyId ?? 'all'}
          onValueChange={(value) => onChange({ specialtyId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger id={`${idPrefix}-specialty`} className={stacked ? 'w-full' : 'w-48'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('specialtyAll')}</SelectItem>
            {specialties?.map((specialty) => (
              <SelectItem key={specialty.id} value={specialty.id}>
                {pickLocalizedName(specialty.name, specialty.nameAr, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-consultation-type`}>{t('consultationType')}</Label>
        <Select
          value={preferences.consultationType ?? 'all'}
          onValueChange={(value) => onChange({ consultationType: value === 'all' ? undefined : value })}
        >
          <SelectTrigger id={`${idPrefix}-consultation-type`} className={stacked ? 'w-full' : 'w-40'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('consultationTypeAll')}</SelectItem>
            <SelectItem value="free">{t('consultationTypeFree')}</SelectItem>
            <SelectItem value="paid">{t('consultationTypePaid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-payment-status`}>{t('paymentStatus')}</Label>
        <Select
          value={preferences.paymentStatus ?? 'all'}
          onValueChange={(value) => onChange({ paymentStatus: value === 'all' ? undefined : value })}
        >
          <SelectTrigger id={`${idPrefix}-payment-status`} className={stacked ? 'w-full' : 'w-44'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('paymentStatusAll')}</SelectItem>
            <SelectItem value="succeeded">{t('paymentStatusSucceeded')}</SelectItem>
            <SelectItem value="failed">{t('paymentStatusFailed')}</SelectItem>
            <SelectItem value="refunded">{t('paymentStatusRefunded')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-verification-status`}>{t('verificationStatus')}</Label>
        <Select
          value={preferences.verificationStatus ?? 'all'}
          onValueChange={(value) => onChange({ verificationStatus: value === 'all' ? undefined : value })}
        >
          <SelectTrigger id={`${idPrefix}-verification-status`} className={stacked ? 'w-full' : 'w-44'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('verificationStatusAll')}</SelectItem>
            <SelectItem value="approved">{t('verificationStatusApproved')}</SelectItem>
            <SelectItem value="rejected">{t('verificationStatusRejected')}</SelectItem>
            <SelectItem value="suspended">{t('verificationStatusSuspended')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={`${idPrefix}-compare`}
          checked={Boolean(preferences.comparePrevious)}
          onCheckedChange={(checked) => onChange({ comparePrevious: checked })}
        />
        <Label htmlFor={`${idPrefix}-compare`}>{t('comparePrevious')}</Label>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-refresh`}>{t('refreshInterval')}</Label>
        <Select
          value={String(preferences.refreshInterval)}
          onValueChange={(value) => onChange({ refreshInterval: (value === 'off' ? 'off' : Number(value)) as RefreshInterval })}
        >
          <SelectTrigger id={`${idPrefix}-refresh`} className={stacked ? 'w-full' : 'w-40'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFRESH_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option === 'off' ? t('refreshOff') : t('refreshEvery', { seconds: option })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
