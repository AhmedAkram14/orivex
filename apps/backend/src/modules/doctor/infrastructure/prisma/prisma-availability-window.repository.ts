import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { AvailabilityWindow } from '../../domain/entities/availability-window.entity.js';
import { DoctorDomainError } from '../../domain/exceptions/doctor-domain.error.js';
import type { AvailabilityWindowRepository } from '../../domain/repositories/availability-window.repository.js';

import { toDomainAvailabilityWindow } from './availability-window.mapper.js';
import { toPrismaConsultationType } from './consultation-type.mapper.js';
import { toPrismaAvailabilityWindowStatus } from './availability-window-status.mapper.js';

@Injectable()
export class PrismaAvailabilityWindowRepository implements AvailabilityWindowRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AvailabilityWindow | null> {
    const row = await this.prisma.availabilityWindow.findUnique({ where: { id } });
    return row ? toDomainAvailabilityWindow(row) : null;
  }

  async findOverlapping(doctorId: string, startTime: Date, endTime: Date): Promise<AvailabilityWindow[]> {
    const rows = await this.prisma.availabilityWindow.findMany({
      where: {
        doctorId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    return rows.map(toDomainAvailabilityWindow);
  }

  // Optimistic locking (architect direction, ahead of SchedulingModule's
  // concurrent slot-reservation use case): updates are conditioned on the
  // version the caller loaded; a 0-row result means another writer already
  // moved the row on, and the caller must reload and retry rather than
  // treat this as a generic failure.
  async save(window: AvailabilityWindow): Promise<void> {
    const data = {
      doctorId: window.getDoctorId(),
      startTime: window.getStartTime(),
      endTime: window.getEndTime(),
      consultationType: toPrismaConsultationType(window.getConsultationType()),
      status: toPrismaAvailabilityWindowStatus(window.getStatus()),
      holdExpiresAt: window.getHoldExpiresAt() ?? null,
    };

    const existing = await this.prisma.availabilityWindow.findUnique({
      where: { id: window.getId() },
      select: { id: true },
    });

    if (!existing) {
      await this.prisma.availabilityWindow.create({
        data: { id: window.getId(), ...data, version: window.getVersion() },
      });
      return;
    }

    const result = await this.prisma.availabilityWindow.updateMany({
      where: { id: window.getId(), version: window.getVersion() },
      data: { ...data, version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new DoctorDomainError(
        `AvailabilityWindow "${window.getId()}" was modified concurrently; reload and retry.`,
      );
    }
  }
}
