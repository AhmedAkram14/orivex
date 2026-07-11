// Matches docs/12-openapi.md's AppointmentSummary.status enum exactly.
export enum AppointmentStatus {
  Requested = 'requested',
  Confirmed = 'confirmed',
  Rescheduled = 'rescheduled',
  Cancelled = 'cancelled',
  NoShow = 'no_show',
  Completed = 'completed',
}
