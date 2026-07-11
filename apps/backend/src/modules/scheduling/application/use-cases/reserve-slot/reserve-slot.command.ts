export interface ReserveSlotCommandProps {
  availabilityWindowId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class ReserveSlotCommand {
  readonly availabilityWindowId: string;

  constructor(props: ReserveSlotCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
  }
}
