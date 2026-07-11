export interface PrescriptionLineItemInput {
  drugCatalogId: string;
  drugName?: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export interface SignPrescriptionCommandProps {
  consultationSessionId: string;
  diagnosisNodeId: string;
  authoringDoctorId: string;
  lineItems: PrescriptionLineItemInput[];
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class SignPrescriptionCommand {
  readonly consultationSessionId: string;
  readonly diagnosisNodeId: string;
  readonly authoringDoctorId: string;
  readonly lineItems: PrescriptionLineItemInput[];

  constructor(props: SignPrescriptionCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.diagnosisNodeId = props.diagnosisNodeId;
    this.authoringDoctorId = props.authoringDoctorId;
    this.lineItems = props.lineItems;
  }
}
