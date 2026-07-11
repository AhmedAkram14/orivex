export interface ReleaseAvailabilityWindowCommandProps {
  availabilityWindowId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class ReleaseAvailabilityWindowCommand {
  readonly availabilityWindowId: string;

  constructor(props: ReleaseAvailabilityWindowCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
  }
}
