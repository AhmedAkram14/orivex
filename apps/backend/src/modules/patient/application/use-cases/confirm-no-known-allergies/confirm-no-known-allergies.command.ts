export interface ConfirmNoKnownAllergiesCommandProps {
  patientProfileId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches UpdatePatientProfileCommand's own convention).
export class ConfirmNoKnownAllergiesCommand {
  readonly patientProfileId: string;

  constructor(props: ConfirmNoKnownAllergiesCommandProps) {
    this.patientProfileId = props.patientProfileId;
  }
}
