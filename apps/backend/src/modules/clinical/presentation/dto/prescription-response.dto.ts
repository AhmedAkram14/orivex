import type { Prescription } from '../../domain/entities/prescription.entity.js';
import type { PrescriptionStatus } from '../../domain/enums/prescription-status.enum.js';

import { PrescriptionLineItemDto } from './prescription-line-item.dto.js';

// Matches docs/12-openapi.md's PrescriptionSummary schema exactly.
// derivedFromSuggestionId is always null -- the Prescription entity doesn't
// persist this link yet (see SignPrescriptionRequestDto's
// derivedFromSuggestionId comment); not blocked on AIModule, which now exists.
export class PrescriptionResponseDto {
  id!: string;
  consultationSessionId!: string;
  diagnosisNodeId!: string;
  status!: PrescriptionStatus;
  lineItems!: PrescriptionLineItemDto[];
  signedAt!: string | null;
  derivedFromSuggestionId!: null;

  static fromDomain(prescription: Prescription): PrescriptionResponseDto {
    const dto = new PrescriptionResponseDto();
    dto.id = prescription.getId();
    dto.consultationSessionId = prescription.getConsultationSessionId();
    dto.diagnosisNodeId = prescription.getDiagnosisNodeId();
    dto.status = prescription.getStatus();
    dto.lineItems = prescription.getLineItems().map((item) => {
      const lineItem = new PrescriptionLineItemDto();
      lineItem.drugCatalogId = item.getDrugCatalogId();
      lineItem.drugName = item.getDrugName();
      lineItem.dosage = item.getDosage();
      lineItem.frequency = item.getFrequency();
      lineItem.durationDays = item.getDurationDays();
      lineItem.instructions = item.getInstructions();
      return lineItem;
    });
    dto.signedAt = prescription.getSignedAt()?.toISOString() ?? null;
    dto.derivedFromSuggestionId = null;
    return dto;
  }
}
