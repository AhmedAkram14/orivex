import type { Prescription as PrismaPrescriptionRow, PrescriptionLineItem as PrismaPrescriptionLineItemRow } from '@prisma/client';

import { Prescription } from '../../domain/entities/prescription.entity.js';
import { PrescriptionLineItem } from '../../domain/entities/prescription-line-item.entity.js';

import { toDomainPrescriptionStatus } from './prescription-status.mapper.js';

export type PersistedPrescriptionRow = PrismaPrescriptionRow & {
  lineItems: PrismaPrescriptionLineItemRow[];
};

export function toDomainPrescription(row: PersistedPrescriptionRow): Prescription {
  return Prescription.reconstitute({
    id: row.id,
    consultationSessionId: row.consultationSessionId,
    diagnosisNodeId: row.diagnosisNodeId,
    authoringDoctorId: row.authoringDoctorId,
    status: toDomainPrescriptionStatus(row.status),
    signedAt: row.signedAt ?? undefined,
    lineItems: row.lineItems.map((item) =>
      PrescriptionLineItem.reconstitute({
        id: item.id,
        drugCatalogId: item.drugCatalogId,
        drugName: item.drugName ?? undefined,
        dosage: item.dosage,
        frequency: item.frequency,
        durationDays: item.durationDays,
        instructions: item.instructions ?? undefined,
      }),
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
