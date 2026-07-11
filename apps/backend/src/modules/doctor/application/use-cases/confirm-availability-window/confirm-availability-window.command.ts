export interface ConfirmAvailabilityWindowCommandProps {
  availabilityWindowId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class ConfirmAvailabilityWindowCommand {
  readonly availabilityWindowId: string;

  constructor(props: ConfirmAvailabilityWindowCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
  }
}
