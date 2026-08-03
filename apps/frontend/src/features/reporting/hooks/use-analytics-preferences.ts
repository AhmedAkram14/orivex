'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadAnalyticsPreferences,
  saveAnalyticsPreferences,
  type AnalyticsPreferences,
  type RefreshInterval,
} from '@/features/reporting/lib/analytics-preferences';

const REFRESH_INTERVAL_MS: Record<RefreshInterval, number | false> = {
  off: false,
  30: 30_000,
  60: 60_000,
  300: 300_000,
};

/** Owns the Analytics Dashboard's filter/compare/refresh-interval state, persisted to localStorage on every change (Compare Periods + Live Refresh + persisted filters, all in one place so every panel reads the same source of truth). */
export function useAnalyticsPreferences() {
  const [preferences, setPreferences] = useState<AnalyticsPreferences>(() => loadAnalyticsPreferences());

  useEffect(() => {
    saveAnalyticsPreferences(preferences);
  }, [preferences]);

  const updatePreferences = useCallback((patch: Partial<AnalyticsPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);

  const filter = {
    dateFrom: preferences.dateFrom,
    dateTo: preferences.dateTo,
    doctorId: preferences.doctorId,
    specialtyId: preferences.specialtyId,
    consultationType: preferences.consultationType,
    paymentStatus: preferences.paymentStatus,
    verificationStatus: preferences.verificationStatus,
    comparePrevious: preferences.comparePrevious,
  };

  return {
    filter,
    refreshInterval: preferences.refreshInterval,
    refetchIntervalMs: REFRESH_INTERVAL_MS[preferences.refreshInterval],
    updatePreferences,
  };
}
