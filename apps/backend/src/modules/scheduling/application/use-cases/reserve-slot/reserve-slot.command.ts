export interface ReserveSlotCommandProps {
  availabilityWindowId: string;
  // See ReserveAvailabilityWindowCommand.holdUntil.
  holdUntil?: Date;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class ReserveSlotCommand {
  readonly availabilityWindowId: string;
  readonly holdUntil?: Date;

  constructor(props: ReserveSlotCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
    this.holdUntil = props.holdUntil;
  }
}
