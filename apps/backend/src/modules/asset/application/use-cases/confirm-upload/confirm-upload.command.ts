export interface ConfirmUploadCommandProps {
  mediaAssetId: string;
  callerAccountId: string;
}

export class ConfirmUploadCommand {
  readonly mediaAssetId: string;
  readonly callerAccountId: string;

  constructor(props: ConfirmUploadCommandProps) {
    this.mediaAssetId = props.mediaAssetId;
    this.callerAccountId = props.callerAccountId;
  }
}
