import { describe, expect, it } from 'vitest';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from './timezone';

describe('timezone', () => {
  it('exposes the single operating timezone', () => {
    expect(DEFAULT_TIME_ZONE).toBe('Africa/Cairo');
  });

  it('formats a short offset label for the operating timezone', () => {
    const label = getTimezoneOffsetLabel(DEFAULT_TIME_ZONE, 'en', new Date(2026, 6, 15));
    expect(label).toMatch(/GMT\+\d/);
  });
});
