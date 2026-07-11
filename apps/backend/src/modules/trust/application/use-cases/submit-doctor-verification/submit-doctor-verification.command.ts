export interface SubmitDoctorVerificationCommandProps {
  doctorId: string;
  licenseNumber: string;
  specialtyCode: string;
  documentAssetIds: string[];
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class SubmitDoctorVerificationCommand {
  readonly doctorId: string;
  readonly licenseNumber: string;
  readonly specialtyCode: string;
  readonly documentAssetIds: string[];

  constructor(props: SubmitDoctorVerificationCommandProps) {
    this.doctorId = props.doctorId;
    this.licenseNumber = props.licenseNumber;
    this.specialtyCode = props.specialtyCode;
    this.documentAssetIds = props.documentAssetIds;
  }
}
