import type { WaitlistEntry } from '../entities/waitlist-entry.entity.js';

export interface WaitlistEntryRepository {
  findById(id: string): Promise<WaitlistEntry | null>;
  /** The caller's own entries, newest first. */
  listByPatientId(patientId: string): Promise<WaitlistEntry[]>;
  /** True if the patient already has an active (Waiting or Notified) entry for this doctor. */
  hasActiveEntry(patientId: string, doctorId: string): Promise<boolean>;
  /**
   * Atomically claims the single earliest-created still-Waiting entry for
   * this doctor whose date range covers `windowStart` and whose desired
   * consultation type (if any) matches `windowType`, transitioning it to
   * Notified in the same operation so two concurrent matches (e.g. the
   * "release" and a near-simultaneous "define" of a second window) can
   * never both claim it -- the conditional update's own WHERE clause is
   * the concurrency guard, not an application-level lock. Returns null if
   * nothing eligible was Waiting.
   */
  claimEarliestEligibleEntry(
    doctorId: string,
    windowStart: Date,
    windowType: 'FREE' | 'PAID',
  ): Promise<WaitlistEntry | null>;
  save(entry: WaitlistEntry): Promise<void>;
  update(entry: WaitlistEntry): Promise<void>;
}
