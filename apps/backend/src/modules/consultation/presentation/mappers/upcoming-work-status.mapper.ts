import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';

export type UpcomingWorkStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';

// Presentation-layer, one-off translation for the Doctor Workspace's
// "upcoming work" list -- maps the real AppointmentStatus enum onto the
// frontend's 4-value UpcomingWorkStatus union. `Requested`/`Confirmed`/
// `Rescheduled` are all still-pending work ("upcoming"); `Cancelled`/
// `NoShow` both mean the slot didn't happen ("cancelled"). There is
// deliberately no live "in-progress" signal wired here -- that would need a
// per-appointment ConsultationSession state lookup, out of scope for a
// dashboard list -- so this mapper never returns 'in-progress'.
export function toUpcomingWorkStatus(status: AppointmentStatus): UpcomingWorkStatus {
  switch (status) {
    case AppointmentStatus.Requested:
    case AppointmentStatus.Confirmed:
    case AppointmentStatus.Rescheduled:
      return 'upcoming';
    case AppointmentStatus.Completed:
      return 'completed';
    case AppointmentStatus.Cancelled:
    case AppointmentStatus.NoShow:
      return 'cancelled';
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}
