export interface PatientDashboardSummary {
  upcomingAppointmentsCount: number;
  activePrescriptionsCount: number;
  /** ISO date of the most recent completed visit — undefined means no visit on record yet, never a fabricated date. */
  lastVisitAt?: string;
}

export type UpcomingAppointmentPreviewStatus = 'upcoming' | 'in-progress';

/**
 * The dashboard's "next few appointments" preview — deliberately lighter
 * than milestone 3's full `Appointment` type (no location/notes/history),
 * since the dashboard only ever renders a short upcoming list, never the
 * full paginated/filterable appointment history.
 */
export interface UpcomingAppointmentPreview {
  id: string;
  /** ISO timestamp — components format it for display, this type never carries pre-formatted text. */
  scheduledAt: string;
  doctorName: string;
  specialization: string;
  status: UpcomingAppointmentPreviewStatus;
}

export type UpcomingAppointmentsResponse = UpcomingAppointmentPreview[];

export type ActivePrescriptionPreviewStatus = 'active' | 'refill-due';

/**
 * The dashboard's "active medications" preview — lighter than milestone 5's
 * full `Prescription` type (no full dosage schedule/refill history).
 */
export interface ActivePrescriptionPreview {
  id: string;
  medicationName: string;
  /** Pre-formatted, localized dosage text (e.g. "500mg, twice daily") — this type never carries raw dosage numbers to format. */
  dosageLabel: string;
  prescribedBy: string;
  status: ActivePrescriptionPreviewStatus;
}

export type ActivePrescriptionsResponse = ActivePrescriptionPreview[];
