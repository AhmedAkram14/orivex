export interface ReserveAvailabilityWindowCommandProps {
  availabilityWindowId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class ReserveAvailabilityWindowCommand {
  readonly availabilityWindowId: string;

  constructor(props: ReserveAvailabilityWindowCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
  }
}
