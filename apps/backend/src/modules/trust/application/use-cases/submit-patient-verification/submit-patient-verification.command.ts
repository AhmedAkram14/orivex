export interface SubmitPatientVerificationCommandProps {
  patientProfileId: string;
  subjectAccountId: string;
  documentAssetIds: string[];
}

// Commands are application messages, not structural types — immutable by
// construction (matches SubmitDoctorVerificationCommand's own established
// shape). Onboarding Redesign (2026-07-21 proposal, Stage O.2).
export class SubmitPatientVerificationCommand {
  readonly patientProfileId: string;
  readonly subjectAccountId: string;
  readonly documentAssetIds: string[];

  constructor(props: SubmitPatientVerificationCommandProps) {
    this.patientProfileId = props.patientProfileId;
    this.subjectAccountId = props.subjectAccountId;
    this.documentAssetIds = props.documentAssetIds;
  }
}
