import type { VerifyPrescriptionResult } from '../../application/use-cases/verify-prescription/verify-prescription.use-case.js';

// I12 -- Prescription digital signature and verification marker: the
// public GET /prescriptions/verify/:code response shape -- deliberately its
// own DTO, not PrescriptionResponseDto/PrescriptionLineItemDto, since a
// public caller never sees an internal prescription/consultationSessionId/
// diagnosisNodeId/drugCatalogId -- only what a pharmacist actually needs to
// dispense against.
export class VerifiedPrescriptionLineItemDto {
  drugName!: string;
  dosage!: string;
  frequency!: string;
  durationDays!: number;
  instructions?: string;
}

export class VerifyPrescriptionResponseDto {
  valid!: boolean;
  doctorName?: string;
  doctorLicenseNumber?: string;
  patientName?: string;
  signedAt?: string;
  lineItems?: VerifiedPrescriptionLineItemDto[];

  static fromResult(result: VerifyPrescriptionResult): VerifyPrescriptionResponseDto {
    const dto = new VerifyPrescriptionResponseDto();
    dto.valid = result.valid;
    if (result.valid) {
      dto.doctorName = result.doctorName;
      dto.doctorLicenseNumber = result.doctorLicenseNumber;
      dto.patientName = result.patientName;
      dto.signedAt = result.signedAt.toISOString();
      dto.lineItems = result.lineItems.map((item) => {
        const lineItem = new VerifiedPrescriptionLineItemDto();
        lineItem.drugName = item.drugName;
        lineItem.dosage = item.dosage;
        lineItem.frequency = item.frequency;
        lineItem.durationDays = item.durationDays;
        lineItem.instructions = item.instructions;
        return lineItem;
      });
    }
    return dto;
  }
}
