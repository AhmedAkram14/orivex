import { randomUUID } from 'node:crypto';

import { SecurityEventStatus } from '../enums/security-event-status.enum.js';
import { SecurityEventType } from '../enums/security-event-type.enum.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';

export interface RecordSecurityEventProps {
  accountId: string;
  eventType: SecurityEventType;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface ReconstituteSecurityEventProps {
  id: string;
  accountId: string;
  eventType: SecurityEventType;
  status: SecurityEventStatus;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  detectedAt: Date;
}

// Append-only audit trail (docs/10-backend-architecture.md's TrustModule
// entry: "Owned entities: ..., SecurityEvent"). No decide()/resolve()
// behavior exists yet — review/resolution workflow is out of this sprint's
// scope. record() is the "create" factory; reconstitute() (added for the
// login-history read path, GET /auth/login-history) is its "load from
// storage" counterpart, mirroring every other aggregate in this codebase
// (e.g. Notification.reconstitute()).
export class SecurityEvent {
  private constructor(
    private readonly id: string,
    private readonly accountId: string,
    private readonly eventType: SecurityEventType,
    private readonly status: SecurityEventStatus,
    private readonly ipAddress: string | undefined,
    private readonly userAgent: string | undefined,
    private readonly metadata: Record<string, unknown>,
    private readonly detectedAt: Date,
  ) {}

  static record(props: RecordSecurityEventProps): SecurityEvent {
    if (!props.accountId || props.accountId.trim().length === 0) {
      throw new TrustDomainError('accountId must not be empty.');
    }

    return new SecurityEvent(
      randomUUID(),
      props.accountId,
      props.eventType,
      SecurityEventStatus.Detected,
      props.ipAddress,
      props.userAgent,
      props.metadata ?? {},
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteSecurityEventProps): SecurityEvent {
    return new SecurityEvent(
      props.id,
      props.accountId,
      props.eventType,
      props.status,
      props.ipAddress,
      props.userAgent,
      props.metadata,
      props.detectedAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getEventType(): SecurityEventType {
    return this.eventType;
  }

  getStatus(): SecurityEventStatus {
    return this.status;
  }

  getIpAddress(): string | undefined {
    return this.ipAddress;
  }

  getUserAgent(): string | undefined {
    return this.userAgent;
  }

  getMetadata(): Record<string, unknown> {
    return this.metadata;
  }

  getDetectedAt(): Date {
    return this.detectedAt;
  }
}
