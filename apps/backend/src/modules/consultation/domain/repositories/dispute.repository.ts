import type { Dispute } from '../entities/dispute.entity.js';
import type { DisputeStatus } from '../enums/dispute-status.enum.js';

export interface DisputeRepository {
  findById(id: string): Promise<Dispute | null>;
  findByAppointmentId(appointmentId: string): Promise<Dispute | null>;
  /** The caller's own disputes -- either party who raised one. Newest first. */
  listByRaisedByAccountId(accountId: string): Promise<Dispute[]>;
  /** I11 -- Admin dispute resolution: the admin queue, newest first. */
  listByStatus(status: DisputeStatus, page: number, limit: number): Promise<{ disputes: Dispute[]; total: number }>;
  save(dispute: Dispute): Promise<void>;
  update(dispute: Dispute): Promise<void>;
}
