export type LoginHistoryOutcomeFilter = 'all' | 'success' | 'failed';

export interface ListLoginHistoryForAccountQuery {
  accountId: string;
  page?: number;
  limit?: number;
  from?: Date;
  to?: Date;
  outcome?: LoginHistoryOutcomeFilter;
}
