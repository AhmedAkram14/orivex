import type { useFormatter } from 'next-intl';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import type { AvailabilityWindowData } from '@/features/scheduling/types';

type Formatter = ReturnType<typeof useFormatter>;

/**
 * Consultation Pricing Redesign: the one, shared display-formatting helper
 * for a window's real backend-supplied price (`consultationType`/
 * `feeAmount`/`feeCurrency`) -- `BookingFlow` and `UpcomingSlotsPanel` both
 * need the identical "FREE" / "500 EGP" label, so it's formatted in exactly
 * one place rather than each re-deriving it. Never computes a price -- only
 * formats what the backend already returned (`AvailabilityWindowResponseDto`
 * is the source of truth).
 *
 * Phase 8: now routes through the shared `formatCurrency` helper (backed by
 * next-intl's `useFormatter()`) instead of constructing its own
 * `Intl.NumberFormat(locale, ...)`, so this and every other money value in
 * the app format identically.
 */
export function formatConsultationPrice(
  window: Pick<AvailabilityWindowData, 'consultationType' | 'feeAmount' | 'feeCurrency'>,
  format: Formatter,
  freeLabel: string,
): string {
  if (window.consultationType === 'free' || window.feeAmount === null || window.feeCurrency === null) {
    return freeLabel;
  }
  return formatCurrency(format, window.feeAmount, window.feeCurrency);
}
