export interface ConfirmSlotCommandProps {
  availabilityWindowId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class ConfirmSlotCommand {
  readonly availabilityWindowId: string;

  constructor(props: ConfirmSlotCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
  }
}
