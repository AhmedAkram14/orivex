// The Patient Portal dashboard's "active medications" preview
// (GET /patients/me/active-prescriptions) -- a lighter shape than
// ClinicalModule's own PrescriptionResponseDto (no full lineItems array).
// `status` is a fixed literal, not the full PrescriptionStatus enum -- this
// route only ever returns prescriptions this controller has already
// computed as currently-active (signedAt + max durationDays across line
// items is still in the future); there is no "refill" concept anywhere in
// the real Prescription domain (no refill count, no pharmacy integration),
// so 'refill-due' is deliberately never emitted.
export class ActivePrescriptionPreviewResponseDto {
  id!: string;
  medicationName!: string;
  /** Pre-formatted "{dosage}, {frequency}" text -- never raw numbers alone. */
  dosageLabel!: string;
  prescribedBy!: string;
  status!: 'active';

  static create(props: {
    id: string;
    medicationName: string;
    dosageLabel: string;
    prescribedBy: string;
  }): ActivePrescriptionPreviewResponseDto {
    const dto = new ActivePrescriptionPreviewResponseDto();
    dto.id = props.id;
    dto.medicationName = props.medicationName;
    dto.dosageLabel = props.dosageLabel;
    dto.prescribedBy = props.prescribedBy;
    dto.status = 'active';
    return dto;
  }
}
