import type { BloodType } from '../../../domain/enums/blood-type.enum.js';
import type { EmergencyContactInput } from '../create-patient-profile/create-patient-profile.command.js';

export interface UpdatePatientProfileCommandProps {
  patientProfileId: string;
  emergencyContacts?: EmergencyContactInput[];
  // Onboarding Redesign (2026-07-21 proposal, Stage O.3).
  bloodType?: BloodType | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  insuranceProviderId?: string | null;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class UpdatePatientProfileCommand {
  readonly patientProfileId: string;
  readonly emergencyContacts?: EmergencyContactInput[];
  readonly bloodType?: BloodType | null;
  readonly allergies?: string | null;
  readonly chronicDiseases?: string | null;
  readonly insuranceProviderId?: string | null;

  constructor(props: UpdatePatientProfileCommandProps) {
    this.patientProfileId = props.patientProfileId;
    this.emergencyContacts = props.emergencyContacts;
    this.bloodType = props.bloodType;
    this.allergies = props.allergies;
    this.chronicDiseases = props.chronicDiseases;
    this.insuranceProviderId = props.insuranceProviderId;
  }
}
