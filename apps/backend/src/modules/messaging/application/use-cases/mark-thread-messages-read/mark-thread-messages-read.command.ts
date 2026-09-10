export interface MarkThreadMessagesReadCommandProps {
  threadId: string;
  callerAccountId: string;
}

export class MarkThreadMessagesReadCommand {
  readonly threadId: string;
  readonly callerAccountId: string;

  constructor(props: MarkThreadMessagesReadCommandProps) {
    this.threadId = props.threadId;
    this.callerAccountId = props.callerAccountId;
  }
}
