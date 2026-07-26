export class GetMediaAssetCommand {
  readonly mediaAssetId: string;
  readonly callerAccountId: string;
  readonly callerIsAdmin: boolean;

  constructor(props: { mediaAssetId: string; callerAccountId: string; callerIsAdmin: boolean }) {
    this.mediaAssetId = props.mediaAssetId;
    this.callerAccountId = props.callerAccountId;
    this.callerIsAdmin = props.callerIsAdmin;
  }
}
