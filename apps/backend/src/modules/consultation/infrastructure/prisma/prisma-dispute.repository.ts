import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Dispute } from '../../domain/entities/dispute.entity.js';
import type { DisputeCategory } from '../../domain/enums/dispute-category.enum.js';
import type { DisputeStatus } from '../../domain/enums/dispute-status.enum.js';
import type { DisputeRepository } from '../../domain/repositories/dispute.repository.js';

import { toDomainDispute, toPrismaDisputeCategory, toPrismaDisputeStatus } from './dispute.mapper.js';

@Injectable()
export class PrismaDisputeRepository implements DisputeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Dispute | null> {
    const row = await this.prisma.dispute.findUnique({ where: { id } });
    return row ? toDomainDispute(row) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Dispute | null> {
    const row = await this.prisma.dispute.findUnique({ where: { appointmentId } });
    return row ? toDomainDispute(row) : null;
  }

  // Dispute System Hardening Phase 1: an access-control predicate belongs in
  // the query, not composed client-side -- a doctor and a patient on the
  // same appointment both see the same dispute, regardless of which of them
  // raised it; a genuine third party matches neither branch and sees
  // nothing.
  async listForParty(accountId: string): Promise<Dispute[]> {
    const rows = await this.prisma.dispute.findMany({
      where: {
        appointment: {
          OR: [{ patientProfile: { accountId } }, { doctorProfile: { accountId } }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomainDispute);
  }

  async listByStatus(
    status: DisputeStatus,
    page: number,
    limit: number,
    category?: DisputeCategory,
  ): Promise<{ disputes: Dispute[]; total: number }> {
    const where = {
      status: toPrismaDisputeStatus(status),
      ...(category ? { category: toPrismaDisputeCategory(category) } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return { disputes: rows.map(toDomainDispute), total };
  }

  async save(dispute: Dispute): Promise<void> {
    await this.prisma.dispute.create({
      data: {
        id: dispute.getId(),
        appointmentId: dispute.getAppointmentId(),
        raisedByAccountId: dispute.getRaisedByAccountId(),
        reason: dispute.getReason(),
        status: toPrismaDisputeStatus(dispute.getStatus()),
        category: dispute.getCategory() ? toPrismaDisputeCategory(dispute.getCategory()!) : null,
        attachmentAssetId: dispute.getAttachmentAssetId() ?? null,
        resolutionNotes: dispute.getResolutionNotes() ?? null,
        resolvedByAccountId: dispute.getResolvedByAccountId() ?? null,
        resolvedAt: dispute.getResolvedAt() ?? null,
        createdAt: dispute.getCreatedAt(),
      },
    });
  }

  async update(dispute: Dispute): Promise<void> {
    await this.prisma.dispute.update({
      where: { id: dispute.getId() },
      data: {
        status: toPrismaDisputeStatus(dispute.getStatus()),
        resolutionNotes: dispute.getResolutionNotes() ?? null,
        resolvedByAccountId: dispute.getResolvedByAccountId() ?? null,
        resolvedAt: dispute.getResolvedAt() ?? null,
      },
    });
  }
}
