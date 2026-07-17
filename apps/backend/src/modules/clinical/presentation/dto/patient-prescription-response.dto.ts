// The Patient Portal's full prescriptions list (GET /patients/me/prescriptions)
// -- unlike ActivePrescriptionPreviewResponseDto, this returns EVERY
// prescription found across the patient's appointments' consultation
// sessions (active and expired alike), each with a computed `status`. There
// is no "refill"/"dosesPerDay" concept anywhere in the real Prescription
// domain (no refill count, no pharmacy integration, and `frequency` is
// unstructured free text a doctor typed, not a numeric dose count) and no
// "completed" status distinct from naturally expiring -- so only
// 'active' | 'expired' are ever emitted, never fabricated beyond what the
// domain can honestly compute (signedAt + max durationDays across line
// items vs. now).
export class PatientPrescriptionResponseDto {
  id!: string;
  medicationName!: string;
  dosageAmount!: string;
  frequencyLabel!: string;
  prescribedBy!: string;
  prescribedAt!: string;
  status!: 'active' | 'expired';
  instructions!: string | undefined;

  static create(props: {
    id: string;
    medicationName: string;
    dosageAmount: string;
    frequencyLabel: string;
    prescribedBy: string;
    prescribedAt: string;
    status: 'active' | 'expired';
    instructions: string | undefined;
  }): PatientPrescriptionResponseDto {
    const dto = new PatientPrescriptionResponseDto();
    dto.id = props.id;
    dto.medicationName = props.medicationName;
    dto.dosageAmount = props.dosageAmount;
    dto.frequencyLabel = props.frequencyLabel;
    dto.prescribedBy = props.prescribedBy;
    dto.prescribedAt = props.prescribedAt;
    dto.status = props.status;
    dto.instructions = props.instructions;
    return dto;
  }
}
