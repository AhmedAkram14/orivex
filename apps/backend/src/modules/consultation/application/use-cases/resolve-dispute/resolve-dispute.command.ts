import type { DisputeStatus } from '../../../domain/enums/dispute-status.enum.js';

export interface ResolveDisputeProps {
  disputeId: string;
  status: DisputeStatus.Resolved | DisputeStatus.Dismissed;
  resolutionNotes: string;
  resolverAccountId: string;
}

export class ResolveDisputeCommand {
  readonly disputeId: string;
  readonly status: DisputeStatus.Resolved | DisputeStatus.Dismissed;
  readonly resolutionNotes: string;
  readonly resolverAccountId: string;

  constructor(props: ResolveDisputeProps) {
    this.disputeId = props.disputeId;
    this.status = props.status;
    this.resolutionNotes = props.resolutionNotes;
    this.resolverAccountId = props.resolverAccountId;
  }
}
