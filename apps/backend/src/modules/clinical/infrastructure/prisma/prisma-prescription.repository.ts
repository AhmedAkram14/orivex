import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Prescription } from '../../domain/entities/prescription.entity.js';
import type { PrescriptionRepository } from '../../domain/repositories/prescription.repository.js';

import { toDomainPrescription } from './prescription.mapper.js';
import { toPrismaPrescriptionStatus } from './prescription-status.mapper.js';

const INCLUDE_LINE_ITEMS = { lineItems: true } as const;

@Injectable()
export class PrismaPrescriptionRepository implements PrescriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Prescription | null> {
    const row = await this.prisma.prescription.findUnique({ where: { id }, include: INCLUDE_LINE_ITEMS });
    return row ? toDomainPrescription(row) : null;
  }

  // Prescription has no mutation methods after signing (immutable once
  // signed, docs/09-physical-database.md) -- save() is only ever called
  // once per aggregate instance, at creation.
  async save(prescription: Prescription): Promise<void> {
    const id = prescription.getId();

    await this.prisma.prescription.create({
      data: {
        id,
        consultationSessionId: prescription.getConsultationSessionId(),
        diagnosisNodeId: prescription.getDiagnosisNodeId(),
        authoringDoctorId: prescription.getAuthoringDoctorId(),
        status: toPrismaPrescriptionStatus(prescription.getStatus()),
        signedAt: prescription.getSignedAt() ?? null,
        lineItems: {
          create: prescription.getLineItems().map((item) => ({
            id: item.getId(),
            drugCatalogId: item.getDrugCatalogId(),
            drugName: item.getDrugName() ?? null,
            dosage: item.getDosage(),
            frequency: item.getFrequency(),
            durationDays: item.getDurationDays(),
            instructions: item.getInstructions() ?? null,
          })),
        },
      },
    });
  }
}
