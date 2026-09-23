export interface ConfirmNoKnownAllergiesCommandProps {
  patientProfileId: string;
  confirmedByDoctorId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches UpdatePatientProfileCommand's own convention).
export class ConfirmNoKnownAllergiesCommand {
  readonly patientProfileId: string;
  readonly confirmedByDoctorId: string;

  constructor(props: ConfirmNoKnownAllergiesCommandProps) {
    this.patientProfileId = props.patientProfileId;
    this.confirmedByDoctorId = props.confirmedByDoctorId;
  }
}
