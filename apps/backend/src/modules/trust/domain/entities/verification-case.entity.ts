import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';
import { VerificationCaseAlreadyDecidedError } from '../exceptions/verification-case-already-decided.error.js';
import { VerificationCaseNotApprovedError } from '../exceptions/verification-case-not-approved.error.js';
import { VerificationStatus } from '../enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';
import type { VerificationSubjectDetails } from '../value-objects/verification-subject-details.js';

export interface SubmitVerificationCaseProps {
  subjectAccountId: string;
  subjectDetails: VerificationSubjectDetails;
  documentAssetIds: string[];
}

export type VerificationDecisionStatus =
  | VerificationStatus.Approved
  | VerificationStatus.Rejected
  | VerificationStatus.MoreInfoNeeded;

export interface ReconstituteVerificationCaseProps {
  id: string;
  subjectAccountId: string;
  subjectDetails: VerificationSubjectDetails;
  documentAssetIds: string[];
  status: VerificationStatus;
  reason?: string;
  submittedAt: Date;
  decidedAt?: Date;
}

// Aggregate root of TrustModule (docs/10-backend-architecture.md's
// TrustModule entry: "Owned entities: VerificationCase, ..."). ConsentRecord
// is deliberately excluded — out of scope per IMPLEMENTATION_PLAN.md.
// SecurityEvent is TrustModule's other owned entity, its own aggregate root,
// not part of this one.
//
// Onboarding Redesign (2026-07-21 proposal, Stage O.2): generalized from
// Doctor-only to any verification subject. Owns only subjectAccountId,
// subjectType, review lifecycle (status/reason/timestamps), documents, and
// a subject-specific VerificationSubjectDetails value object -- no doctorId,
// no license/specialty fields directly. Subject-specific behavior (what
// event Approval raises, if any) is dispatched polymorphically through
// subjectDetails, never via a subjectType branch inside this class: adding a
// third verification subject means adding a new VerificationSubjectDetails
// implementation and a new static factory here, nothing else in this file
// changes (Open/Closed).
export class VerificationCase {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly subjectAccountId: string,
    private readonly subjectDetails: VerificationSubjectDetails,
    private readonly documentAssetIds: string[],
    private status: VerificationStatus,
    private reason: string | undefined,
    private readonly submittedAt: Date,
    private decidedAt: Date | undefined,
  ) {}

  static submit(props: SubmitVerificationCaseProps): VerificationCase {
    if (!props.documentAssetIds || props.documentAssetIds.length === 0) {
      throw new TrustDomainError('At least one documentAssetId is required.');
    }

    return new VerificationCase(
      randomUUID(),
      props.subjectAccountId,
      props.subjectDetails,
      props.documentAssetIds,
      VerificationStatus.Submitted,
      undefined,
      new Date(),
      undefined,
    );
  }

  static reconstitute(props: ReconstituteVerificationCaseProps): VerificationCase {
    return new VerificationCase(
      props.id,
      props.subjectAccountId,
      props.subjectDetails,
      props.documentAssetIds,
      props.status,
      props.reason,
      props.submittedAt,
      props.decidedAt,
    );
  }

  // Approve, reject, or request more info (docs/12-openapi.md's
  // decideVerification). Only a case not yet finally decided can be acted on
  // — Approved/Rejected are terminal for the initial review (suspend() below
  // is a distinct, later transition, reachable only from Approved).
  decide(status: VerificationDecisionStatus, reason?: string): void {
    if (this.status === VerificationStatus.Approved || this.status === VerificationStatus.Rejected) {
      throw new VerificationCaseAlreadyDecidedError(`VerificationCase "${this.id}" has already been decided and cannot be redecided.`);
    }

    this.status = status;
    this.reason = reason;

    if (status === VerificationStatus.Approved || status === VerificationStatus.Rejected) {
      this.decidedAt = new Date();
    }

    if (status === VerificationStatus.Approved) {
      const event = this.subjectDetails.getApprovalEvent(this.subjectAccountId, this.id);
      if (event) {
        this.record(event);
      }
    }
  }

  // Revokes previously-granted standing (license lapse, a compliance
  // finding) without losing the audit trail of ever having been Approved --
  // only reachable from Approved, a distinct transition from decide()'s own
  // initial-review terminal states.
  suspend(reason: string): void {
    if (this.status !== VerificationStatus.Approved) {
      throw new VerificationCaseNotApprovedError(
        `VerificationCase "${this.id}" must be Approved before it can be suspended.`,
      );
    }
    this.status = VerificationStatus.Suspended;
    this.reason = reason;
  }

  getId(): string {
    return this.id;
  }

  getSubjectAccountId(): string {
    return this.subjectAccountId;
  }

  getSubjectType(): VerificationSubjectType {
    return this.subjectDetails.getSubjectType();
  }

  getSubjectDetails(): VerificationSubjectDetails {
    return this.subjectDetails;
  }

  getDocumentAssetIds(): string[] {
    return [...this.documentAssetIds];
  }

  getStatus(): VerificationStatus {
    return this.status;
  }

  getReason(): string | undefined {
    return this.reason;
  }

  getSubmittedAt(): Date {
    return this.submittedAt;
  }

  getDecidedAt(): Date | undefined {
    return this.decidedAt;
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
