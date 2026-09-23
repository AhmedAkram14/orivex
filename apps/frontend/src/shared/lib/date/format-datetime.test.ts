import { describe, expect, it, vi } from 'vitest';
import { formatDateTime, formatExactDateTime } from '@/shared/lib/date/format-datetime';

function fakeFormatter() {
  return { dateTime: vi.fn((_date: Date, _options: Intl.DateTimeFormatOptions) => 'formatted') };
}

describe('formatDateTime', () => {
  it('formats without seconds', () => {
    const format = fakeFormatter();
    const date = new Date('2026-09-22T15:45:00Z');

    const result = formatDateTime(format as never, date);

    expect(result).toBe('formatted');
    expect(format.dateTime).toHaveBeenCalledWith(date, { dateStyle: 'medium', timeStyle: 'short' });
  });
});

describe('formatExactDateTime', () => {
  it('formats with seconds for tooltip precision', () => {
    const format = fakeFormatter();
    const date = new Date('2026-09-22T15:45:00Z');

    formatExactDateTime(format as never, date);

    expect(format.dateTime).toHaveBeenCalledWith(date, { dateStyle: 'medium', timeStyle: 'medium' });
  });
});
