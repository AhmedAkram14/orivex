// Backend proposal from the doctor UX audit remediation (IMPLEMENTATION_NOTES.md,
// Phase 5): lets a notification reference the specific record it's about, so
// the frontend can render a per-entity icon and deep-link precisely instead of
// relying solely on the free-text description + same-origin actionUrl. Only
// covers entity kinds a handler already has a real id for in scope -- never
// inferred or guessed.
export enum NotificationEntityType {
  Appointment = 'appointment',
  Consultation = 'consultation',
  Dispute = 'dispute',
  Prescription = 'prescription',
}
