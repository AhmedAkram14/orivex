export interface ReleaseSlotCommandProps {
  availabilityWindowId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class ReleaseSlotCommand {
  readonly availabilityWindowId: string;

  constructor(props: ReleaseSlotCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
  }
}
