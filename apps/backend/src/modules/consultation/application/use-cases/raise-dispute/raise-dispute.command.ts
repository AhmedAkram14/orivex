import type { DisputeCategory } from '../../../domain/enums/dispute-category.enum.js';

export interface RaiseDisputeProps {
  appointmentId: string;
  callerAccountId: string;
  reason: string;
  category: DisputeCategory;
  attachmentAssetId?: string;
}

export class RaiseDisputeCommand {
  readonly appointmentId: string;
  readonly callerAccountId: string;
  readonly reason: string;
  readonly category: DisputeCategory;
  readonly attachmentAssetId?: string;

  constructor(props: RaiseDisputeProps) {
    this.appointmentId = props.appointmentId;
    this.callerAccountId = props.callerAccountId;
    this.reason = props.reason;
    this.category = props.category;
    this.attachmentAssetId = props.attachmentAssetId;
  }
}
