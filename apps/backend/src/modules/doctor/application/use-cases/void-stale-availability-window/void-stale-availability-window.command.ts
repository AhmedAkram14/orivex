export interface VoidStaleAvailabilityWindowCommandProps {
  availabilityWindowId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class VoidStaleAvailabilityWindowCommand {
  readonly availabilityWindowId: string;

  constructor(props: VoidStaleAvailabilityWindowCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
  }
}
