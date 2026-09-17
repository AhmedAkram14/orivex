// I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): matches
// Dispute's real Prisma enum exactly.
export enum DisputeStatus {
  Open = 'open',
  Resolved = 'resolved',
  Dismissed = 'dismissed',
  // Dispute System Hardening Phase 0: the raiser retracted this themselves,
  // distinct from an admin's Dismissed decision -- a real new terminal value
  // rather than reusing Dismissed, matching this codebase's established
  // preference (see AppointmentStatus.Expired) for a new status when the
  // real-world meaning genuinely differs.
  Withdrawn = 'withdrawn',
}
