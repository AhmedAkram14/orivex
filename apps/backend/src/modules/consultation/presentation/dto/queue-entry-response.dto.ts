export type QueueEntryStatus = 'waiting' | 'in-consultation' | 'completed';

// The Doctor Workspace's Patient Queue (GET /appointments/doctor/queue).
// `label` is the real patient's display name -- PatientModule is real now,
// so this is no longer the anonymized "Patient #3" placeholder the frontend
// type originally anticipated before a real Patient module existed.
export class QueueEntryResponseDto {
  id!: string;
  label!: string;
  status!: QueueEntryStatus;
  position!: number;
  /** Minutes, computed as (queue position - 1) * the global slot duration -- only ever set for `waiting` entries; undefined otherwise, never a fabricated estimate. */
  estimatedWaitMinutes?: number;
}
