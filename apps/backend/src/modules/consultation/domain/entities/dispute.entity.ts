import { randomUUID } from 'node:crypto';

import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';
import { DisputeStatus } from '../enums/dispute-status.enum.js';

export interface RaiseDisputeProps {
  appointmentId: string;
  raisedByAccountId: string;
  reason: string;
}

export interface ReconstituteDisputeProps {
  id: string;
  appointmentId: string;
  raisedByAccountId: string;
  reason: string;
  status: DisputeStatus;
  resolutionNotes?: string;
  resolvedByAccountId?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

// I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): one
// dispute per Appointment (matches MessageThread's own one-per-appointment
// shape), raised by whichever party on the appointment has a concern about
// it, resolved exactly once by an admin -- never re-opened or re-resolved,
// matching the release checklist's "admin actions must be audit-logged
// with actor, timestamp, and reason" requirement made real at the domain
// level, not just left to the controller.
export class Dispute {
  private constructor(
    private readonly id: string,
    private readonly appointmentId: string,
    private readonly raisedByAccountId: string,
    private readonly reason: string,
    private status: DisputeStatus,
    private resolutionNotes: string | undefined,
    private resolvedByAccountId: string | undefined,
    private resolvedAt: Date | undefined,
    private readonly createdAt: Date,
  ) {}

  static raise(props: RaiseDisputeProps): Dispute {
    if (!props.reason || props.reason.trim().length === 0) {
      throw new ConsultationDomainError('A reason is required to raise a dispute.');
    }
    return new Dispute(
      randomUUID(),
      props.appointmentId,
      props.raisedByAccountId,
      props.reason.trim(),
      DisputeStatus.Open,
      undefined,
      undefined,
      undefined,
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteDisputeProps): Dispute {
    return new Dispute(
      props.id,
      props.appointmentId,
      props.raisedByAccountId,
      props.reason,
      props.status,
      props.resolutionNotes,
      props.resolvedByAccountId,
      props.resolvedAt,
      props.createdAt,
    );
  }

  // The admin's one-time decision -- Open is the only valid starting state;
  // a Dispute that's already Resolved/Dismissed is a closed case, not
  // something a later call can silently overwrite (an admin who disagrees
  // with a past decision is a policy question this codebase doesn't
  // attempt to solve here, matching AuditLog's own "immutable once
  // recorded" posture for the trail it leaves).
  resolve(status: DisputeStatus.Resolved | DisputeStatus.Dismissed, notes: string, resolverAccountId: string): void {
    if (this.status !== DisputeStatus.Open) {
      throw new ConsultationDomainError('Only an open dispute can be resolved.');
    }
    if (!notes || notes.trim().length === 0) {
      throw new ConsultationDomainError('Resolution notes are required.');
    }
    this.status = status;
    this.resolutionNotes = notes.trim();
    this.resolvedByAccountId = resolverAccountId;
    this.resolvedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getAppointmentId(): string {
    return this.appointmentId;
  }

  getRaisedByAccountId(): string {
    return this.raisedByAccountId;
  }

  getReason(): string {
    return this.reason;
  }

  getStatus(): DisputeStatus {
    return this.status;
  }

  getResolutionNotes(): string | undefined {
    return this.resolutionNotes;
  }

  getResolvedByAccountId(): string | undefined {
    return this.resolvedByAccountId;
  }

  getResolvedAt(): Date | undefined {
    return this.resolvedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
