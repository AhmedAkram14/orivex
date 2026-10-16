import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';

export type UpcomingWorkStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';

// Presentation-layer, one-off translation for the Doctor Workspace's
// "upcoming work" list -- maps the real AppointmentStatus enum onto the
// frontend's 4-value UpcomingWorkStatus union. `Requested`/`Confirmed` are
// still-pending work ("upcoming"); `Cancelled`/`NoShow`/`Expired`/
// `Rescheduled` all mean this slot didn't happen ("cancelled" -- Rescheduled
// is a reschedule's superseded appointment, the new time being its own
// Requested/Confirmed appointment; the frontend union has no distinct
// "expired" value, and `getDoctorUpcomingWork` filters Expired and Rescheduled
// out before this mapper ever runs anyway, so those branches are
// defensive/exhaustiveness-only in practice). There is deliberately no live
// "in-progress" signal wired here -- that would need a per-appointment
// ConsultationSession state lookup, out of scope for a dashboard list -- so
// this mapper never returns 'in-progress'.
export function toUpcomingWorkStatus(status: AppointmentStatus): UpcomingWorkStatus {
  switch (status) {
    case AppointmentStatus.Requested:
    case AppointmentStatus.Confirmed:
      return 'upcoming';
    case AppointmentStatus.Completed:
      return 'completed';
    case AppointmentStatus.Cancelled:
    case AppointmentStatus.NoShow:
    case AppointmentStatus.Expired:
    case AppointmentStatus.Rescheduled:
      return 'cancelled';
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}
