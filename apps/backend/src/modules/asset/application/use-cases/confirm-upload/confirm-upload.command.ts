export interface ConfirmUploadCommandProps {
  mediaAssetId: string;
}

export class ConfirmUploadCommand {
  readonly mediaAssetId: string;

  constructor(props: ConfirmUploadCommandProps) {
    this.mediaAssetId = props.mediaAssetId;
  }
}
