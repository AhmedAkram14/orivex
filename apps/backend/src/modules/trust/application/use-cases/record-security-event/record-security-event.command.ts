import type { SecurityEventType } from '../../../domain/enums/security-event-type.enum.js';

export interface RecordSecurityEventCommandProps {
  accountId: string;
  eventType: SecurityEventType;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class RecordSecurityEventCommand {
  readonly accountId: string;
  readonly eventType: SecurityEventType;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly metadata?: Record<string, unknown>;

  constructor(props: RecordSecurityEventCommandProps) {
    this.accountId = props.accountId;
    this.eventType = props.eventType;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
    this.metadata = props.metadata;
  }
}
