export interface ListPaymentTransactionsQueryProps {
  page: number;
  limit: number;
}

// Queries are application messages, not structural types -- immutable by
// construction, matching ListAccountsQuery's own established shape.
// page/limit (not limit/offset) -- the use case converts page -> offset
// internally, the repository port only ever sees an offset.
export class ListPaymentTransactionsQuery {
  readonly page: number;
  readonly limit: number;

  constructor(props: ListPaymentTransactionsQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
  }
}
