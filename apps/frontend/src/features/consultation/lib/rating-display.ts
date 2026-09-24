import type { useTranslations } from 'next-intl';

/**
 * Phase 1 UX remediation: single source of truth for how a doctor's rating
 * renders as a value + helper text pair, reused by every page that shows it
 * (Overview's Today's Summary, Patients KPI row, Profile hero stat, Reports
 * tile). Before this, each page independently decided its own threshold for
 * hiding the number (Overview hid it below 5 reviews, Profile hid it only at
 * 0, Patients never hid it) -- which is exactly why the same doctor showed
 * "No ratings yet" on one page and "4.7" on another with the same underlying
 * data. This makes that one decision in one place.
 *
 * Contract: `value` is ALWAYS either a real "X.X" figure or the em dash --
 * never prose (a stat tile's value slot must never carry a sentence, see
 * `StatCard`/`LinkableStatCard`). Any explanatory copy ("not enough
 * ratings yet", "no ratings yet") lives in `helperText` instead.
 */

/** Below this many reviews, the average is still shown (it's real, not fabricated) but framed as not-yet-confident rather than a plain rating count. */
export const MIN_RATING_COUNT_FOR_CONFIDENT_DISPLAY = 5;

export interface RatingDisplayInput {
  averageRating: number | null | undefined;
  reviewCount: number | null | undefined;
}

export interface RatingDisplay {
  value: string;
  helperText: string;
}

type RatingTranslator = ReturnType<typeof useTranslations>;

/**
 * @param t Translator scoped to the `consultation.rating` namespace.
 * @param rangeLabel When set, this rating is scoped to a date range (e.g.
 *   Reports' filter) rather than lifetime -- the helper text is prefixed
 *   with it explicitly (e.g. "Sep 1 – Sep 23, 2026 · 3 ratings") so a
 *   date-scoped figure never silently looks like the same lifetime number
 *   shown elsewhere.
 */
export function getRatingDisplay(t: RatingTranslator, { averageRating, reviewCount }: RatingDisplayInput, rangeLabel?: string): RatingDisplay {
  const count = reviewCount ?? 0;

  if (count === 0 || averageRating == null) {
    return {
      value: '—',
      helperText: rangeLabel ? t('scopedNoRatings', { range: rangeLabel }) : t('noReviewsYet'),
    };
  }

  const value = averageRating.toFixed(1);

  if (rangeLabel) {
    return { value, helperText: t('scopedRatingCount', { range: rangeLabel, count }) };
  }

  if (count < MIN_RATING_COUNT_FOR_CONFIDENT_DISPLAY) {
    return { value, helperText: t('notEnoughRatings', { count }) };
  }

  return { value, helperText: t('ratingCount', { count }) };
}
