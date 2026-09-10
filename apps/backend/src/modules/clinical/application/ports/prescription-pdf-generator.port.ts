export interface PrescriptionPdfLineItem {
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export interface GeneratePrescriptionPdfRequest {
  prescriptionId: string;
  doctorName: string;
  doctorLicenseNumber: string;
  patientName: string;
  signedAt: Date;
  lineItems: PrescriptionPdfLineItem[];
  verificationCode: string;
  /** The full URL GET /prescriptions/verify/:code resolves to -- encoded into the PDF's QR code. */
  verificationUrl: string;
}

// Port only (docs/06-system-architecture.md Section 11). I12 -- Prescription
// PDF generation (ORIVEX Remaining Work Audit).
export interface PrescriptionPdfGeneratorPort {
  generate(request: GeneratePrescriptionPdfRequest): Promise<Buffer>;
}
