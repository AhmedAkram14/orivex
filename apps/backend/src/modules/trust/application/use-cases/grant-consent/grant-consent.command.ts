export interface GrantConsentCommandProps {
  patientId: string;
  doctorId: string;
  scopeCode: string;
  legalBasisVersion: string;
}

export class GrantConsentCommand {
  readonly patientId: string;
  readonly doctorId: string;
  readonly scopeCode: string;
  readonly legalBasisVersion: string;

  constructor(props: GrantConsentCommandProps) {
    this.patientId = props.patientId;
    this.doctorId = props.doctorId;
    this.scopeCode = props.scopeCode;
    this.legalBasisVersion = props.legalBasisVersion;
  }
}
