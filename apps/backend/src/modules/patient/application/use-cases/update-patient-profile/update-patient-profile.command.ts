import type { EmergencyContactInput } from '../create-patient-profile/create-patient-profile.command.js';

export interface UpdatePatientProfileCommandProps {
  patientProfileId: string;
  dateOfBirth?: Date | null;
  emergencyContacts?: EmergencyContactInput[];
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class UpdatePatientProfileCommand {
  readonly patientProfileId: string;
  readonly dateOfBirth?: Date | null;
  readonly emergencyContacts?: EmergencyContactInput[];

  constructor(props: UpdatePatientProfileCommandProps) {
    this.patientProfileId = props.patientProfileId;
    this.dateOfBirth = props.dateOfBirth;
    this.emergencyContacts = props.emergencyContacts;
  }
}
