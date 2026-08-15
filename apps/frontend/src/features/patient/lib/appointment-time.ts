import { isSameDay } from '@/shared/lib/date/week';
import { getCairoNow } from '@/shared/lib/date/timezone';

/**
 * Status alone isn't enough to know whether an appointment is genuinely
 * still upcoming: nothing automatically transitions a Confirmed appointment
 * to a terminal state just because its scheduled time passed without the
 * consultation ever starting (no ConsultationSession exists until someone
 * actually joins, and even the backend's stale-session sweep only reconciles
 * a session that was actually opened). Without this check, a stale Confirmed
 * appointment from days/weeks ago would sit in "Upcoming" indefinitely,
 * still offering a live "Join video call" button for a session that's never
 * going to happen.
 *
 * Same-day is still "upcoming" (a session can legitimately run behind
 * schedule); anything from a prior calendar day, read in Cairo time (this
 * product's one operating timezone), has definitively passed.
 */
export function isAppointmentStillUpcoming(scheduledAt: string, cairoNow: Date = getCairoNow()): boolean {
  const scheduled = new Date(scheduledAt);
  return scheduled.getTime() >= cairoNow.getTime() || isSameDay(getCairoNow(scheduled), cairoNow);
}
