'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import type { AnalyticsPreferences, RefreshInterval } from '@/features/reporting/lib/analytics-preferences';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs text-text-tertiary">
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
  const locale = useLocale();
  const { data: specialties } = useSpecialtiesList();

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border-default bg-surface p-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="analytics-date-from">{t('dateFrom')}</Label>
        <Input
          id="analytics-date-from"
          type="date"
          value={preferences.dateFrom ?? ''}
          onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="analytics-date-to">{t('dateTo')}</Label>
        <Input
          id="analytics-date-to"
          type="date"
          value={preferences.dateTo ?? ''}
          onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="analytics-doctor-id">{t('doctorId')}</Label>
        <Input
          id="analytics-doctor-id"
          value={preferences.doctorId ?? ''}
          onChange={(event) => onChange({ doctorId: event.target.value || undefined })}
          placeholder={t('doctorIdPlaceholder')}
          className="w-56"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="analytics-specialty">{t('specialty')}</Label>
        <Select
          value={preferences.specialtyId ?? 'all'}
          onValueChange={(value) => onChange({ specialtyId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger id="analytics-specialty" className="w-48">
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
        <Label htmlFor="analytics-consultation-type">{t('consultationType')}</Label>
        <Select
          value={preferences.consultationType ?? 'all'}
          onValueChange={(value) => onChange({ consultationType: value === 'all' ? undefined : value })}
        >
          <SelectTrigger id="analytics-consultation-type" className="w-40">
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
        <Label htmlFor="analytics-payment-status">{t('paymentStatus')}</Label>
        <Select
          value={preferences.paymentStatus ?? 'all'}
          onValueChange={(value) => onChange({ paymentStatus: value === 'all' ? undefined : value })}
        >
          <SelectTrigger id="analytics-payment-status" className="w-44">
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
        <Label htmlFor="analytics-verification-status">{t('verificationStatus')}</Label>
        <Select
          value={preferences.verificationStatus ?? 'all'}
          onValueChange={(value) => onChange({ verificationStatus: value === 'all' ? undefined : value })}
        >
          <SelectTrigger id="analytics-verification-status" className="w-44">
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
          id="analytics-compare"
          checked={Boolean(preferences.comparePrevious)}
          onCheckedChange={(checked) => onChange({ comparePrevious: checked })}
        />
        <Label htmlFor="analytics-compare">{t('comparePrevious')}</Label>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="analytics-refresh">{t('refreshInterval')}</Label>
        <Select
          value={String(preferences.refreshInterval)}
          onValueChange={(value) => onChange({ refreshInterval: (value === 'off' ? 'off' : Number(value)) as RefreshInterval })}
        >
          <SelectTrigger id="analytics-refresh" className="w-40">
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
