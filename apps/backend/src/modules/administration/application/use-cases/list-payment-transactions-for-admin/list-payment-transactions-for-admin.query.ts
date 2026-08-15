export interface ListPaymentTransactionsForAdminQueryProps {
  page: number;
  limit: number;
}

// Queries are application messages, not structural types -- immutable by
// construction, matching ListAccountsQuery's own established shape.
export class ListPaymentTransactionsForAdminQuery {
  readonly page: number;
  readonly limit: number;

  constructor(props: ListPaymentTransactionsForAdminQueryProps) {
    this.page = props.page;
    this.limit = props.limit;
  }
}
