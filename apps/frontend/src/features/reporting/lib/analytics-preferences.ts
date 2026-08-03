const STORAGE_KEY = 'orivex-admin-analytics-preferences';

export type RefreshInterval = 'off' | 30 | 60 | 300;

export interface AnalyticsPreferences {
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  specialtyId?: string;
  consultationType?: string;
  paymentStatus?: string;
  verificationStatus?: string;
  comparePrevious?: boolean;
  refreshInterval: RefreshInterval;
}

const DEFAULT_PREFERENCES: AnalyticsPreferences = { refreshInterval: 'off' };

/**
 * Per-browser persistence of the Analytics Dashboard's last filters/refresh
 * choice -- client-side only, the same `localStorage` pattern
 * `recent-searches.ts`/`theme-provider.tsx` already use. No backend storage
 * is introduced for this: nothing here needs to sync across devices or be
 * visible to another admin.
 */
export function loadAnalyticsPreferences(): AnalyticsPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? { ...DEFAULT_PREFERENCES, ...parsed } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveAnalyticsPreferences(preferences: AnalyticsPreferences): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
