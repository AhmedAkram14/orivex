import type { Dispute } from '../entities/dispute.entity.js';
import type { DisputeCategory } from '../enums/dispute-category.enum.js';
import type { DisputeStatus } from '../enums/dispute-status.enum.js';

export interface DisputeRepository {
  findById(id: string): Promise<Dispute | null>;
  findByAppointmentId(appointmentId: string): Promise<Dispute | null>;
  /**
   * Dispute System Hardening Phase 1: every dispute where this account is a
   * genuine party to the underlying appointment -- patient or doctor alike,
   * whichever of them raised it. Replaces the old raiser-only
   * `listByRaisedByAccountId` now that visibility is fully bidirectional
   * (see ListDisputesForCallerUseCase's own comment). Newest first.
   */
  listForParty(accountId: string): Promise<Dispute[]>;
  /** I11 -- Admin dispute resolution: the admin queue, newest first. `category` is an additive optional filter (Dispute System Hardening Phase 1). */
  listByStatus(
    status: DisputeStatus,
    page: number,
    limit: number,
    category?: DisputeCategory,
  ): Promise<{ disputes: Dispute[]; total: number }>;
  save(dispute: Dispute): Promise<void>;
  update(dispute: Dispute): Promise<void>;
}
