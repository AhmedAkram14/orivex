// Matches docs/09-physical-database.md's security_events lifecycle:
// "Detected -> reviewed -> resolved".
export enum SecurityEventStatus {
  Detected = 'detected',
  Reviewed = 'reviewed',
  Resolved = 'resolved',
}
