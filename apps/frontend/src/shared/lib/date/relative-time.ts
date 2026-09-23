const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

const JUST_NOW_THRESHOLD_MS = 60_000;

/**
 * Native `Intl.RelativeTimeFormat` -- no date library (the app has none;
 * keeping it that way, see this function's callers). `nowLabel` renders
 * anything under a minute old as "Active now"/"just now" instead of the
 * technically-correct but less useful "0 minutes ago" an RTF would produce.
 */
export function formatRelativeTime(date: Date, locale: string, nowLabel: string): string {
  const diffMs = date.getTime() - Date.now();
  if (Math.abs(diffMs) < JUST_NOW_THRESHOLD_MS) {
    return nowLabel;
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  let duration = diffMs / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), 'years');
}
