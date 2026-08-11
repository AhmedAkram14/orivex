import type { AvailabilityWindowData } from '@/features/scheduling/types';

/**
 * Consultation Pricing Redesign: the one, shared display-formatting helper
 * for a window's real backend-supplied price (`consultationType`/
 * `feeAmount`/`feeCurrency`) -- `BookingFlow` and `UpcomingSlotsPanel` both
 * need the identical "FREE" / "500 EGP" label, so it's formatted in exactly
 * one place rather than each re-deriving it. Never computes a price -- only
 * formats what the backend already returned (`AvailabilityWindowResponseDto`
 * is the source of truth).
 */
export function formatConsultationPrice(
  window: Pick<AvailabilityWindowData, 'consultationType' | 'feeAmount' | 'feeCurrency'>,
  locale: string,
  freeLabel: string,
): string {
  if (window.consultationType === 'free' || window.feeAmount === null || window.feeCurrency === null) {
    return freeLabel;
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency: window.feeCurrency }).format(window.feeAmount);
}
