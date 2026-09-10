import type { AuditAction } from '../../../domain/enums/audit-action.enum.js';

export interface ListAuditLogEntriesQueryProps {
  page: number;
  limit: number;
  actorAccountId?: string;
  subjectType?: string;
  subjectId?: string;
  action?: AuditAction;
}

// Queries are application messages, not structural types -- immutable by
// construction, matching ListAccountsQuery's own established shape.
export class ListAuditLogEntriesQuery {
  readonly page: number;
  readonly limit: number;
  readonly actorAccountId?: string;
  readonly subjectType?: string;
  readonly subjectId?: string;
  readonly action?: AuditAction;

  constructor(props: ListAuditLogEntriesQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
    this.actorAccountId = props.actorAccountId;
    this.subjectType = props.subjectType;
    this.subjectId = props.subjectId;
    this.action = props.action;
  }
}
