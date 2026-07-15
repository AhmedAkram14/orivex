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

// Append-only audit trail (docs/10-backend-architecture.md's TrustModule
// entry: "Owned entities: ..., SecurityEvent"). No decide()/resolve()
// behavior exists yet — review/resolution workflow is out of this sprint's
// scope, and no controller reads these back, so reconstitute() is
// deliberately omitted (nothing rehydrates a SecurityEvent from storage).
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
