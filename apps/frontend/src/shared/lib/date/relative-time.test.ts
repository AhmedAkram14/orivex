import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '@/shared/lib/date/relative-time';

describe('formatRelativeTime', () => {
  it('returns the "now" label for anything under a minute old', () => {
    const now = new Date(Date.now() - 5_000);
    expect(formatRelativeTime(now, 'en', 'Active now')).toBe('Active now');
  });

  it('formats minutes ago in English', () => {
    const date = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(date, 'en', 'Active now')).toBe('5 minutes ago');
  });

  it('formats days ago in English', () => {
    const date = new Date(Date.now() - 3 * 86_400_000);
    expect(formatRelativeTime(date, 'en', 'Active now')).toBe('3 days ago');
  });

  it("formats minutes ago in Arabic, with the runtime's own Arabic digits", () => {
    const date = new Date(Date.now() - 5 * 60_000);
    const result = formatRelativeTime(date, 'ar', 'الآن');
    // Which digits `ar` uses ("٥" or "5") comes from the runtime's ICU data, not from this function -- the
    // same Node prints "٥" on one machine and "5" on another -- so compare with that runtime's own `ar` five.
    expect(result).toContain(new Intl.NumberFormat('ar').format(5));
    expect(result).toContain('دقائق');
  });

  it('formats a future date with future phrasing', () => {
    const date = new Date(Date.now() + 5 * 60_000);
    expect(formatRelativeTime(date, 'en', 'Active now')).toBe('in 5 minutes');
  });
});
