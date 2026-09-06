import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { ConsentGrantedEvent } from '../events/consent-granted.event.js';
import { ConsentRevokedEvent } from '../events/consent-revoked.event.js';
import { ConsentState } from '../enums/consent-state.enum.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';

export interface RecordConsentChangeProps {
  patientId: string;
  doctorId: string;
  scopeCategoryId: string;
  scopeCategoryCode: string;
  state: ConsentState;
  previousVersionNumber: number;
  legalBasisVersion: string;
}

export interface ReconstituteConsentRecordProps {
  id: string;
  patientId: string;
  doctorId: string;
  scopeCategoryId: string;
  state: ConsentState;
  versionNumber: number;
  legalBasisVersion: string;
  effectiveAt: Date;
  createdAt: Date;
}

// Append-only, versioned (schema.prisma's own ConsentRecord comment carries
// the full rationale) -- there is no update()/revoke() method that mutates
// an existing row; recordChange() always produces a brand-new row at the
// next version number. The caller (GrantConsentUseCase/RevokeConsentUseCase)
// is responsible for reading the current highest versionNumber first (via
// the repository) and passing it in as previousVersionNumber -- this entity
// only enforces that the new version is a real increment, not what that
// prior version actually was, so it stays a plain factory rather than
// needing the entire prior history loaded into memory.
export class ConsentRecord {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly scopeCategoryId: string,
    private readonly state: ConsentState,
    private readonly versionNumber: number,
    private readonly legalBasisVersion: string,
    private readonly effectiveAt: Date,
    private readonly createdAt: Date,
  ) {}

  static recordChange(props: RecordConsentChangeProps): ConsentRecord {
    if (!props.patientId || props.patientId.trim().length === 0) {
      throw new TrustDomainError('patientId must not be empty.');
    }
    if (!props.doctorId || props.doctorId.trim().length === 0) {
      throw new TrustDomainError('doctorId must not be empty.');
    }
    if (props.previousVersionNumber < 0) {
      throw new TrustDomainError('previousVersionNumber must not be negative.');
    }
    if (!props.legalBasisVersion || props.legalBasisVersion.trim().length === 0) {
      throw new TrustDomainError('legalBasisVersion must not be empty.');
    }

    const now = new Date();
    const record = new ConsentRecord(
      randomUUID(),
      props.patientId,
      props.doctorId,
      props.scopeCategoryId,
      props.state,
      props.previousVersionNumber + 1,
      props.legalBasisVersion,
      now,
      now,
    );

    record.record(
      props.state === ConsentState.Granted
        ? new ConsentGrantedEvent(props.patientId, props.doctorId, props.scopeCategoryCode)
        : new ConsentRevokedEvent(props.patientId, props.doctorId, props.scopeCategoryCode),
    );

    return record;
  }

  static reconstitute(props: ReconstituteConsentRecordProps): ConsentRecord {
    return new ConsentRecord(
      props.id,
      props.patientId,
      props.doctorId,
      props.scopeCategoryId,
      props.state,
      props.versionNumber,
      props.legalBasisVersion,
      props.effectiveAt,
      props.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getScopeCategoryId(): string {
    return this.scopeCategoryId;
  }

  getState(): ConsentState {
    return this.state;
  }

  getVersionNumber(): number {
    return this.versionNumber;
  }

  getLegalBasisVersion(): string {
    return this.legalBasisVersion;
  }

  getEffectiveAt(): Date {
    return this.effectiveAt;
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
