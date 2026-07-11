import type { EmergencyRelationship } from '../../../domain/enums/emergency-relationship.enum.js';

export interface EmergencyContactInput {
  name: string;
  relationship: EmergencyRelationship;
  phoneNumber: string;
}

export interface CreatePatientProfileCommandProps {
  accountId: string;
  dateOfBirth?: Date;
  emergencyContacts?: EmergencyContactInput[];
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class CreatePatientProfileCommand {
  readonly accountId: string;
  readonly dateOfBirth?: Date;
  readonly emergencyContacts?: EmergencyContactInput[];

  constructor(props: CreatePatientProfileCommandProps) {
    this.accountId = props.accountId;
    this.dateOfBirth = props.dateOfBirth;
    this.emergencyContacts = props.emergencyContacts;
  }
}
