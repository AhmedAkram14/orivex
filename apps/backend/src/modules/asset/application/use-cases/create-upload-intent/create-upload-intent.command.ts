import type { MediaAssetPurpose } from '../../../domain/enums/media-asset-purpose.enum.js';

export interface CreateUploadIntentCommandProps {
  ownerAccountId: string;
  purpose: MediaAssetPurpose;
  contentType: string;
  sizeEstimate?: number;
}

export class CreateUploadIntentCommand {
  readonly ownerAccountId: string;
  readonly purpose: MediaAssetPurpose;
  readonly contentType: string;
  readonly sizeEstimate?: number;

  constructor(props: CreateUploadIntentCommandProps) {
    this.ownerAccountId = props.ownerAccountId;
    this.purpose = props.purpose;
    this.contentType = props.contentType;
    this.sizeEstimate = props.sizeEstimate;
  }
}
