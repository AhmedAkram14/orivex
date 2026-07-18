import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { PrescriptionSignedEvent } from '../events/prescription-signed.event.js';
import { PrescriptionStatus } from '../enums/prescription-status.enum.js';
import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

import { PrescriptionLineItem, type CreatePrescriptionLineItemProps } from './prescription-line-item.entity.js';

export interface SignPrescriptionProps {
  consultationSessionId: string;
  diagnosisNodeId: string;
  authoringDoctorId: string;
  lineItems: CreatePrescriptionLineItemProps[];
}

export interface ReconstitutePrescriptionProps {
  id: string;
  consultationSessionId: string;
  diagnosisNodeId: string;
  authoringDoctorId: string;
  status: PrescriptionStatus;
  signedAt?: Date;
  lineItems: PrescriptionLineItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root of ClinicalModule (docs/10-backend-architecture.md's
// ClinicalModule entry; docs/09-physical-database.md's prescriptions
// table: "Draft -> signed (immutable) -> superseded"). The only documented
// entry point (docs/12-openapi.md's signPrescription) creates a
// Prescription already Signed -- there is no exposed Draft/Doctor-Edited
// step, so this aggregate is created directly in Signed status, matching
// the real contract rather than the fuller conceptual lifecycle.
// Superseding is deliberately not modeled -- no documented workflow
// creates it this sprint.
export class Prescription {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly consultationSessionId: string,
    private readonly diagnosisNodeId: string,
    private readonly authoringDoctorId: string,
    private readonly status: PrescriptionStatus,
    private readonly signedAt: Date | undefined,
    private readonly lineItems: PrescriptionLineItem[],
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
  ) {}

  static sign(props: SignPrescriptionProps): Prescription {
    if (!props.lineItems || props.lineItems.length === 0) {
      throw new ClinicalDomainError('A prescription requires at least one line item.');
    }

    const now = new Date();
    const prescription = new Prescription(
      randomUUID(),
      props.consultationSessionId,
      props.diagnosisNodeId,
      props.authoringDoctorId,
      PrescriptionStatus.Signed,
      now,
      props.lineItems.map((item) => PrescriptionLineItem.create(item)),
      now,
      now,
    );

    prescription.record(new PrescriptionSignedEvent(prescription.id));
    return prescription;
  }

  static reconstitute(props: ReconstitutePrescriptionProps): Prescription {
    return new Prescription(
      props.id,
      props.consultationSessionId,
      props.diagnosisNodeId,
      props.authoringDoctorId,
      props.status,
      props.signedAt,
      props.lineItems,
      props.createdAt,
      props.updatedAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getConsultationSessionId(): string {
    return this.consultationSessionId;
  }

  getDiagnosisNodeId(): string {
    return this.diagnosisNodeId;
  }

  getAuthoringDoctorId(): string {
    return this.authoringDoctorId;
  }

  getStatus(): PrescriptionStatus {
    return this.status;
  }

  getSignedAt(): Date | undefined {
    return this.signedAt;
  }

  getLineItems(): PrescriptionLineItem[] {
    return [...this.lineItems];
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // No "active/expired" status field is stored on this entity -- it's
  // derived purely from the entity's own state (signedAt + the longest
  // line item's durationDays), so it belongs here rather than recomputed
  // in a presentation-layer controller (Production Readiness Audit --
  // "move business rules from presentation to application").
  isCurrentlyActive(now: Date): boolean {
    if (!this.signedAt || this.lineItems.length === 0) {
      return false;
    }
    const maxDurationDays = Math.max(...this.lineItems.map((item) => item.getDurationDays()));
    const expiresAt = this.signedAt.getTime() + maxDurationDays * 24 * 60 * 60 * 1000;
    return expiresAt > now.getTime();
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
