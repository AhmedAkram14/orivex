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

const JOIN_WINDOW_OPENS_BEFORE_MS = 15 * 60_000;
const JOIN_WINDOW_CLOSES_AFTER_MS = 60 * 60_000;

/**
 * Join-Window Enforcement feature: "Join video call" is only meaningful
 * starting 15 minutes before the scheduled time (not earlier -- there's
 * nothing to join yet), and only until 1 hour after it (past that, the
 * appointment is being/about to be reconciled No-show by the backend's own
 * sweep -- MarkMissedAppointmentsNoShowUseCase). Matches
 * MintConsultationRoomTokenUseCase's own patient-side guard exactly, so a
 * disabled/hidden button here always agrees with what the real API would
 * actually accept. Real elapsed-time arithmetic on the two real UTC
 * instants -- deliberately NOT `getCairoNow()`, which shifts a Date for
 * *display* getters and would corrupt this math.
 */
export function canJoinCall(scheduledAt: string, now: Date = new Date()): boolean {
  const scheduled = new Date(scheduledAt).getTime();
  return now.getTime() >= scheduled - JOIN_WINDOW_OPENS_BEFORE_MS && now.getTime() <= scheduled + JOIN_WINDOW_CLOSES_AFTER_MS;
}
