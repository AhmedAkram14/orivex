import type { AuditAction } from '../../../domain/enums/audit-action.enum.js';

export interface RecordAuditLogCommandProps {
  actorAccountId: string;
  actorRole: string;
  action: AuditAction;
  subjectType: string;
  subjectId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

// Commands are application messages, not structural types — immutable by
// construction (matches RecordSecurityEventCommand's established style).
export class RecordAuditLogCommand {
  readonly actorAccountId: string;
  readonly actorRole: string;
  readonly action: AuditAction;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;

  constructor(props: RecordAuditLogCommandProps) {
    this.actorAccountId = props.actorAccountId;
    this.actorRole = props.actorRole;
    this.action = props.action;
    this.subjectType = props.subjectType;
    this.subjectId = props.subjectId;
    this.reason = props.reason;
    this.metadata = props.metadata;
  }
}
