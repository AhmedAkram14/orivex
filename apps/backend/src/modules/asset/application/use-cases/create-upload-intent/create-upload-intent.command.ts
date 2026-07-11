import type { MediaAssetPurpose } from '../../../domain/enums/media-asset-purpose.enum.js';

export interface CreateUploadIntentCommandProps {
  purpose: MediaAssetPurpose;
  contentType: string;
  sizeEstimate?: number;
}

export class CreateUploadIntentCommand {
  readonly purpose: MediaAssetPurpose;
  readonly contentType: string;
  readonly sizeEstimate?: number;

  constructor(props: CreateUploadIntentCommandProps) {
    this.purpose = props.purpose;
    this.contentType = props.contentType;
    this.sizeEstimate = props.sizeEstimate;
  }
}
