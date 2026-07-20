import type { AccountRole } from '../../../domain/enums/account-role.enum.js';

export interface ListAccountsQueryProps {
  page: number;
  limit: number;
  role?: AccountRole;
}

// Queries are application messages, not structural types — immutable by
// construction (all fields readonly, no mutators), matching every other
// Command/Query in this codebase. page/limit (not limit/offset) matches
// ListAppointmentsForPatientPageQuery's own established pagination shape —
// the use case converts page -> offset internally, the repository port
// only ever sees an offset.
export class ListAccountsQuery {
  readonly page: number;
  readonly limit: number;
  readonly role?: AccountRole;

  constructor(props: ListAccountsQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
    this.role = props.role;
  }
}
