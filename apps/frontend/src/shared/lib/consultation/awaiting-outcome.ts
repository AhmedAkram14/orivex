import { JOIN_WINDOW_CLOSES_AFTER_MS } from '@/shared/lib/consultation/join-window';

/**
 * A `confirmed` appointment whose slot (and join window) is over, with no
 * consultation having produced an outcome yet. Nothing transitions such an
 * appointment on its own until the backend's sweep reconciles it, so the UI
 * shows a neutral "Awaiting outcome" instead of a misleading "Confirmed",
 * and the patient is not offered Cancel/Reschedule for a visit that has
 * already passed. The end is the later of the booked window's end and the
 * join window's close, so a consultation still legitimately joinable is never
 * reported as over.
 */
export function isAwaitingOutcome(
  appointment: { status: string; scheduledAt: string; endTime?: string },
  now: Date = new Date(),
): boolean {
  if (appointment.status !== 'confirmed') return false;
  const scheduled = new Date(appointment.scheduledAt).getTime();
  const slotEnd = appointment.endTime ? new Date(appointment.endTime).getTime() : scheduled;
  const over = Math.max(slotEnd, scheduled + JOIN_WINDOW_CLOSES_AFTER_MS);
  return now.getTime() > over;
}
