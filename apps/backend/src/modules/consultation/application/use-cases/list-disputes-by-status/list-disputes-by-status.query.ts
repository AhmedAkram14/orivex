import type { DisputeStatus } from '../../../domain/enums/dispute-status.enum.js';

export interface ListDisputesByStatusQueryProps {
  status: DisputeStatus;
  page: number;
  limit: number;
}

export class ListDisputesByStatusQuery {
  readonly status: DisputeStatus;
  readonly page: number;
  readonly limit: number;

  constructor(props: ListDisputesByStatusQueryProps) {
    this.status = props.status;
    this.page = props.page;
    this.limit = props.limit;
  }
}
