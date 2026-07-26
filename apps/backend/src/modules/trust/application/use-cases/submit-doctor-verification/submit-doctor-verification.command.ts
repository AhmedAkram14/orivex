export interface SubmitDoctorVerificationCommandProps {
  doctorId: string;
  subjectAccountId: string;
  licenseNumber: string;
  specialtyCode: string;
  documentAssetIds: string[];
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
//
// Onboarding Redesign (2026-07-21 proposal, Stage O.2): doctorId stays --
// it's still how the caller names which DoctorProfile is being verified,
// and the use case still confirms it exists -- but subjectAccountId (the
// caller's own account, resolved by the controller) is what actually
// constructs the generalized VerificationCase now, not a lookup through
// the profile.
export class SubmitDoctorVerificationCommand {
  readonly doctorId: string;
  readonly subjectAccountId: string;
  readonly licenseNumber: string;
  readonly specialtyCode: string;
  readonly documentAssetIds: string[];

  constructor(props: SubmitDoctorVerificationCommandProps) {
    this.doctorId = props.doctorId;
    this.subjectAccountId = props.subjectAccountId;
    this.licenseNumber = props.licenseNumber;
    this.specialtyCode = props.specialtyCode;
    this.documentAssetIds = props.documentAssetIds;
  }
}
