export interface CancelWaitlistEntryCommandProps {
  waitlistEntryId: string;
  callerAccountId: string;
}

export class CancelWaitlistEntryCommand {
  readonly waitlistEntryId: string;
  readonly callerAccountId: string;

  constructor(props: CancelWaitlistEntryCommandProps) {
    this.waitlistEntryId = props.waitlistEntryId;
    this.callerAccountId = props.callerAccountId;
  }
}
