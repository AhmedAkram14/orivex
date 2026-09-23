// Named, exported thresholds (Patient Record Page P0 fix) -- both the tile
// and the test import the same constant, so there is exactly one place to
// change when a clinician decides these numbers should be different.
export const VITAL_STALE_AFTER_DAYS = 90;
export const ALLERGY_CONFIRMATION_STALE_AFTER_DAYS = 365;

const MS_PER_DAY = 86_400_000;

export function isStale(date: Date, thresholdDays: number, now: Date = new Date()): boolean {
  return now.getTime() - date.getTime() > thresholdDays * MS_PER_DAY;
}
