import { afterEach, describe, expect, it } from 'vitest';

import { loadAnalyticsPreferences, saveAnalyticsPreferences } from './analytics-preferences';

afterEach(() => {
  window.localStorage.clear();
});

describe('analytics-preferences', () => {
  it('returns the default (refresh off, no filters) when nothing is stored yet', () => {
    expect(loadAnalyticsPreferences()).toEqual({ refreshInterval: 'off' });
  });

  it('round-trips a saved preference set exactly', () => {
    saveAnalyticsPreferences({ dateFrom: '2026-01-01', doctorId: 'd1', refreshInterval: 60 });

    expect(loadAnalyticsPreferences()).toEqual({ dateFrom: '2026-01-01', doctorId: 'd1', refreshInterval: 60 });
  });

  it('falls back to defaults when the stored value is corrupt JSON', () => {
    window.localStorage.setItem('orivex-admin-analytics-preferences', 'not-json');

    expect(loadAnalyticsPreferences()).toEqual({ refreshInterval: 'off' });
  });
});
