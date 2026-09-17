import type { DisputeCategory } from '../../../domain/enums/dispute-category.enum.js';
import type { DisputeStatus } from '../../../domain/enums/dispute-status.enum.js';

export interface ListDisputesByStatusQueryProps {
  status: DisputeStatus;
  page: number;
  limit: number;
  // Dispute System Hardening Phase 1: additive, alongside the existing
  // status filter.
  category?: DisputeCategory;
}

export class ListDisputesByStatusQuery {
  readonly status: DisputeStatus;
  readonly page: number;
  readonly limit: number;
  readonly category?: DisputeCategory;

  constructor(props: ListDisputesByStatusQueryProps) {
    this.status = props.status;
    this.page = props.page;
    this.limit = props.limit;
    this.category = props.category;
  }
}
