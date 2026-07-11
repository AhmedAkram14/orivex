import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { DoctorVerifiedEvent } from '../events/doctor-verified.event.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';
import { VerificationStatus } from '../enums/verification-status.enum.js';

export interface SubmitVerificationCaseProps {
  doctorId: string;
  licenseNumber: string;
  specialtyCode: string;
  documentAssetIds: string[];
}

export type VerificationDecisionStatus =
  | VerificationStatus.Approved
  | VerificationStatus.Rejected
  | VerificationStatus.MoreInfoNeeded;

export interface ReconstituteVerificationCaseProps {
  id: string;
  doctorId: string;
  licenseNumber: string;
  specialtyCode: string;
  documentAssetIds: string[];
  status: VerificationStatus;
  reason?: string;
  submittedAt: Date;
  decidedAt?: Date;
}

// Aggregate root of TrustModule (docs/10-backend-architecture.md's
// TrustModule entry: "Owned entities: VerificationCase, ..."). ConsentRecord
// and SecurityEvent are deliberately excluded — out of Sprint 4's scope per
// IMPLEMENTATION_PLAN.md ("Doctor verification, VerificationCase, Review
// workflow, Administration integration" only).
export class VerificationCase {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly doctorId: string,
    private readonly licenseNumber: string,
    private readonly specialtyCode: string,
    private readonly documentAssetIds: string[],
    private status: VerificationStatus,
    private reason: string | undefined,
    private readonly submittedAt: Date,
    private decidedAt: Date | undefined,
  ) {}

  static submit(props: SubmitVerificationCaseProps): VerificationCase {
    if (!props.licenseNumber || props.licenseNumber.trim().length === 0) {
      throw new TrustDomainError('licenseNumber must not be empty.');
    }
    if (!props.specialtyCode || props.specialtyCode.trim().length === 0) {
      throw new TrustDomainError('specialtyCode must not be empty.');
    }
    if (!props.documentAssetIds || props.documentAssetIds.length === 0) {
      throw new TrustDomainError('At least one documentAssetId is required.');
    }

    return new VerificationCase(
      randomUUID(),
      props.doctorId,
      props.licenseNumber.trim(),
      props.specialtyCode.trim(),
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
      props.doctorId,
      props.licenseNumber,
      props.specialtyCode,
      props.documentAssetIds,
      props.status,
      props.reason,
      props.submittedAt,
      props.decidedAt,
    );
  }

  // Approve, reject, or request more info (docs/12-openapi.md's
  // decideVerification). Only a case not yet finally decided can be acted on
  // — Approved/Rejected are terminal for this sprint's scope (re-verification
  // scheduling internals are explicitly future work, per
  // docs/10-backend-architecture.md's TrustModule entry).
  decide(status: VerificationDecisionStatus, reason?: string): void {
    if (this.status === VerificationStatus.Approved || this.status === VerificationStatus.Rejected) {
      throw new TrustDomainError(`VerificationCase "${this.id}" has already been decided and cannot be redecided.`);
    }

    this.status = status;
    this.reason = reason;

    if (status === VerificationStatus.Approved || status === VerificationStatus.Rejected) {
      this.decidedAt = new Date();
    }

    if (status === VerificationStatus.Approved) {
      this.record(new DoctorVerifiedEvent(this.doctorId, this.id));
    }
  }

  getId(): string {
    return this.id;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getLicenseNumber(): string {
    return this.licenseNumber;
  }

  getSpecialtyCode(): string {
    return this.specialtyCode;
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
