import { randomUUID } from 'node:crypto';

import { AuditAction } from '../enums/audit-action.enum.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';

export interface RecordAuditLogEntryProps {
  actorAccountId: string;
  actorRole: string;
  action: AuditAction;
  subjectType: string;
  subjectId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

// Append-only audit trail (ORIVEX Remaining Work Audit, P0 C2 --
// schema.prisma's AuditLog model comment carries the full rationale). Never
// updated or deleted once recorded -- no decide()/resolve() behavior, unlike
// SecurityEvent's status lifecycle, because an audit row's whole point is
// that it is never revised after the fact.
export class AuditLog {
  private constructor(
    private readonly id: string,
    private readonly actorAccountId: string,
    private readonly actorRole: string,
    private readonly action: AuditAction,
    private readonly subjectType: string,
    private readonly subjectId: string,
    private readonly reason: string | undefined,
    private readonly metadata: Record<string, unknown>,
    private readonly createdAt: Date,
  ) {}

  static record(props: RecordAuditLogEntryProps): AuditLog {
    if (!props.actorAccountId || props.actorAccountId.trim().length === 0) {
      throw new TrustDomainError('actorAccountId must not be empty.');
    }
    if (!props.subjectId || props.subjectId.trim().length === 0) {
      throw new TrustDomainError('subjectId must not be empty.');
    }

    return new AuditLog(
      randomUUID(),
      props.actorAccountId,
      props.actorRole,
      props.action,
      props.subjectType,
      props.subjectId,
      props.reason,
      props.metadata ?? {},
      new Date(),
    );
  }

  getId(): string {
    return this.id;
  }

  getActorAccountId(): string {
    return this.actorAccountId;
  }

  getActorRole(): string {
    return this.actorRole;
  }

  getAction(): AuditAction {
    return this.action;
  }

  getSubjectType(): string {
    return this.subjectType;
  }

  getSubjectId(): string {
    return this.subjectId;
  }

  getReason(): string | undefined {
    return this.reason;
  }

  getMetadata(): Record<string, unknown> {
    return this.metadata;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
