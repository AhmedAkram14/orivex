export interface SendMessageCommandProps {
  threadId: string;
  senderAccountId: string;
  body: string;
  attachmentAssetId?: string;
}

export class SendMessageCommand {
  readonly threadId: string;
  readonly senderAccountId: string;
  readonly body: string;
  readonly attachmentAssetId?: string;

  constructor(props: SendMessageCommandProps) {
    this.threadId = props.threadId;
    this.senderAccountId = props.senderAccountId;
    this.body = props.body;
    this.attachmentAssetId = props.attachmentAssetId;
  }
}
