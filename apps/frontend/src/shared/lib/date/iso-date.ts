/** True for a real calendar date written `YYYY-MM-DD` (rejects 2026-02-31 and partial dates like `0000-03-15`). */
export function isRealIsoDate(value: string | undefined): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Today in Cairo (the operating time zone) as `YYYY-MM-DD`. */
export function cairoToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
}

/** This year in Cairo. */
export function cairoYear(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric' }).format(
      new Date(),
    ),
  );
}
