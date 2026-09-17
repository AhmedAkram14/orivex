import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';
import { DisputeStatus } from '../enums/dispute-status.enum.js';
import type { DisputeCategory } from '../enums/dispute-category.enum.js';
import { DisputeRaisedEvent } from '../events/dispute-raised.event.js';
import { DisputeResolvedEvent } from '../events/dispute-resolved.event.js';
import { DisputeDismissedEvent } from '../events/dispute-dismissed.event.js';
import { DisputeWithdrawnEvent } from '../events/dispute-withdrawn.event.js';

export interface RaiseDisputeProps {
  appointmentId: string;
  raisedByAccountId: string;
  reason: string;
  // Dispute System Hardening Phase 0: required going forward at this layer
  // (not the DB layer -- existing rows predate this field and have none;
  // see the Prisma schema's own comment on `category`'s nullability).
  category?: DisputeCategory;
  attachmentAssetId?: string;
}

export interface ReconstituteDisputeProps {
  id: string;
  appointmentId: string;
  raisedByAccountId: string;
  reason: string;
  status: DisputeStatus;
  category?: DisputeCategory;
  attachmentAssetId?: string;
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
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly appointmentId: string,
    private readonly raisedByAccountId: string,
    private readonly reason: string,
    private status: DisputeStatus,
    private readonly category: DisputeCategory | undefined,
    private readonly attachmentAssetId: string | undefined,
    private resolutionNotes: string | undefined,
    private resolvedByAccountId: string | undefined,
    private resolvedAt: Date | undefined,
    private readonly createdAt: Date,
  ) {}

  static raise(props: RaiseDisputeProps): Dispute {
    if (!props.reason || props.reason.trim().length === 0) {
      throw new ConsultationDomainError('A reason is required to raise a dispute.');
    }
    const dispute = new Dispute(
      randomUUID(),
      props.appointmentId,
      props.raisedByAccountId,
      props.reason.trim(),
      DisputeStatus.Open,
      props.category,
      props.attachmentAssetId,
      undefined,
      undefined,
      undefined,
      new Date(),
    );

    dispute.record(new DisputeRaisedEvent(dispute.id));
    return dispute;
  }

  static reconstitute(props: ReconstituteDisputeProps): Dispute {
    return new Dispute(
      props.id,
      props.appointmentId,
      props.raisedByAccountId,
      props.reason,
      props.status,
      props.category,
      props.attachmentAssetId,
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
  // recorded" posture for the trail it leaves). Records a distinct event
  // per terminal status -- DisputeResolvedEvent vs. DisputeDismissedEvent
  // are two different real-world facts, matching the
  // AppointmentDeclinedEvent/AppointmentCancelledEvent precedent.
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
    this.record(
      status === DisputeStatus.Resolved
        ? new DisputeResolvedEvent(this.id)
        : new DisputeDismissedEvent(this.id),
    );
  }

  // Dispute System Hardening Phase 0: the raiser retracting their own
  // dispute while an admin has not yet acted on it. Valid only from Open --
  // once an admin has resolved or dismissed it, it's a closed case (same
  // reasoning as resolve()'s own guard), and it obviously can't be
  // withdrawn twice. This method deliberately takes no caller/account
  // argument and performs no ownership check -- that authorization belongs
  // in the use case, matching this codebase's existing convention that
  // domain methods trust the use case for caller identity (see
  // ResolveDisputeUseCase's own comment: "Ownership/role is entirely
  // enforced by [the] controller's own ... guard").
  withdraw(): void {
    if (this.status !== DisputeStatus.Open) {
      throw new ConsultationDomainError('Only an open dispute can be withdrawn.');
    }
    this.status = DisputeStatus.Withdrawn;
    this.record(new DisputeWithdrawnEvent(this.id));
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

  getCategory(): DisputeCategory | undefined {
    return this.category;
  }

  getAttachmentAssetId(): string | undefined {
    return this.attachmentAssetId;
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

  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
