export interface SendAppointmentReminderCommandProps {
  accountId: string;
  scheduledAt: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class SendAppointmentReminderCommand {
  readonly accountId: string;
  readonly scheduledAt: string;

  constructor(props: SendAppointmentReminderCommandProps) {
    this.accountId = props.accountId;
    this.scheduledAt = props.scheduledAt;
  }
}
