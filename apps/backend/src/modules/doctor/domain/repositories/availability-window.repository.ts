import type { AvailabilityWindow } from '../entities/availability-window.entity.js';

export interface AvailabilityWindowRepository {
  findById(id: string): Promise<AvailabilityWindow | null>;
  // Non-overlap enforcement (architect direction): any window for the same
  // doctor whose [startTime, endTime) range intersects the given range.
  findOverlapping(doctorId: string, startTime: Date, endTime: Date): Promise<AvailabilityWindow[]>;
  // Onboarding Redesign integration-gap closure (2026-07-25): every window
  // (any status) for a doctor starting within [from, to) -- lets a caller
  // (SchedulingModule's bookable-availability orchestrator) see what already
  // exists before materializing new ones, without duplicating the overlap
  // check `findOverlapping` already owns.
  findByDoctorAndRange(doctorId: string, from: Date, to: Date): Promise<AvailabilityWindow[]>;
  // Throws on a stale version (optimistic locking) -- callers must reload
  // and retry rather than treat this as a generic failure.
  save(window: AvailabilityWindow): Promise<void>;
  // Join-Window/Stale-Slot Reclamation: permanently removes a never-booked
  // window. Callers must confirm `Open` status themselves first (this
  // method has no domain knowledge of status) -- throws
  // AvailabilityWindowConflictError instead of deleting if a real
  // Appointment still references this row (e.g. a since-cancelled booking
  // that reverted the window back to Open but kept its own historical
  // record), never silently orphaning that reference.
  deleteById(id: string): Promise<void>;
}
