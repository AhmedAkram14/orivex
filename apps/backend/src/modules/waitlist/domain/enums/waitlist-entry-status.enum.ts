// N8-Waitlist (ORIVEX Remaining Work Audit): matches WaitlistEntry's real
// Prisma enum exactly.
export enum WaitlistEntryStatus {
  Waiting = 'waiting',
  Notified = 'notified',
  Fulfilled = 'fulfilled',
  Cancelled = 'cancelled',
}
