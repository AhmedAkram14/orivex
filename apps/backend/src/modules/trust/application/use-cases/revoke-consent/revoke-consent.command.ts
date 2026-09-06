export interface RevokeConsentCommandProps {
  patientId: string;
  doctorId: string;
  scopeCode: string;
  legalBasisVersion: string;
}

export class RevokeConsentCommand {
  readonly patientId: string;
  readonly doctorId: string;
  readonly scopeCode: string;
  readonly legalBasisVersion: string;

  constructor(props: RevokeConsentCommandProps) {
    this.patientId = props.patientId;
    this.doctorId = props.doctorId;
    this.scopeCode = props.scopeCode;
    this.legalBasisVersion = props.legalBasisVersion;
  }
}
