export interface ReserveAvailabilityWindowCommandProps {
  availabilityWindowId: string;
  // Hold until this instant instead of the default short booking-flow hold
  // (AvailabilityWindow.hold()). Used for a request that will wait on the
  // doctor's approval, which can take days.
  holdUntil?: Date;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class ReserveAvailabilityWindowCommand {
  readonly availabilityWindowId: string;
  readonly holdUntil?: Date;

  constructor(props: ReserveAvailabilityWindowCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
    this.holdUntil = props.holdUntil;
  }
}
