// Matches docs/12-openapi.md's AppointmentSummary.status enum exactly.
export enum AppointmentStatus {
  Requested = 'requested',
  Confirmed = 'confirmed',
  Rescheduled = 'rescheduled',
  Cancelled = 'cancelled',
  NoShow = 'no_show',
  Completed = 'completed',
  // Phase 0 (stale-request terminal state): a Requested appointment nobody
  // ever answered (approved, declined, or paid for) before its scheduledAt
  // passed. Distinct from Cancelled -- a doctor/patient never made an
  // affirmative decision here, the request just went stale -- and distinct
  // from NoShow, which only ever applies to a Confirmed appointment whose
  // join window closed. See Appointment.expire().
  Expired = 'expired',
}
