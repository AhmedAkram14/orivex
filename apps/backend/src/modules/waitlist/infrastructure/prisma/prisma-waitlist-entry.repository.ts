import { Injectable } from '@nestjs/common';
import type { WaitlistEntry as PrismaWaitlistEntry } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';

import { toDomainWaitlistEntry, toPrismaConsultationType, toPrismaWaitlistEntryStatus } from './waitlist-entry.mapper.js';

@Injectable()
export class PrismaWaitlistEntryRepository implements WaitlistEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<WaitlistEntry | null> {
    const row = await this.prisma.waitlistEntry.findUnique({ where: { id } });
    return row ? toDomainWaitlistEntry(row) : null;
  }

  async listByPatientId(patientId: string): Promise<WaitlistEntry[]> {
    const rows = await this.prisma.waitlistEntry.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomainWaitlistEntry);
  }

  async hasActiveEntry(patientId: string, doctorId: string): Promise<boolean> {
    const count = await this.prisma.waitlistEntry.count({
      where: { patientId, doctorId, status: { in: ['WAITING', 'NOTIFIED'] } },
    });
    return count > 0;
  }

  async claimEarliestEligibleEntry(
    doctorId: string,
    windowStart: Date,
    windowType: 'FREE' | 'PAID',
  ): Promise<WaitlistEntry | null> {
    // Atomic claim via a CTE, not a scalar subquery in the UPDATE's WHERE --
    // the CTE form is the well-established, race-safe Postgres idiom for
    // "claim exactly one row" (the scalar-subquery form was tried first
    // and *looked* correct but this module's own concurrency integration
    // test caught it letting 2 of 8 concurrent callers both claim the same
    // row -- the planner does not give a bare correlated scalar subquery
    // the same single-execution locking guarantee a CTE gets). The CTE's
    // FOR UPDATE SKIP LOCKED both selects and locks the single
    // earliest-created eligible row; a concurrent claim attempt for the
    // same opportunity either finds a different still-Waiting row or,
    // once none remain, an empty CTE -- so its UPDATE ... FROM cte joins
    // zero rows and affects nothing.
    const rows = await this.prisma.$queryRaw<PrismaWaitlistEntry[]>`
      WITH claimed AS (
        SELECT id FROM "WaitlistEntry"
        WHERE "doctorId" = ${doctorId}
          AND status = 'WAITING'
          AND "earliestAcceptableAt" <= ${windowStart}
          AND "latestAcceptableAt" >= ${windowStart}
          AND ("consultationType" IS NULL OR "consultationType" = ${windowType}::"ConsultationType")
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "WaitlistEntry" AS w
      SET status = 'NOTIFIED', "notifiedAt" = now(), "updatedAt" = now()
      FROM claimed
      WHERE w.id = claimed.id
      RETURNING w.*
    `;
    const row = rows[0];
    return row ? toDomainWaitlistEntry(row) : null;
  }

  async save(entry: WaitlistEntry): Promise<void> {
    await this.prisma.waitlistEntry.create({
      data: {
        id: entry.getId(),
        patientId: entry.getPatientId(),
        doctorId: entry.getDoctorId(),
        consultationType: toPrismaConsultationType(entry.getConsultationType()),
        earliestAcceptableAt: entry.getEarliestAcceptableAt(),
        latestAcceptableAt: entry.getLatestAcceptableAt(),
        status: toPrismaWaitlistEntryStatus(entry.getStatus()),
        notifiedAt: entry.getNotifiedAt() ?? null,
        fulfilledAt: entry.getFulfilledAt() ?? null,
        cancelledAt: entry.getCancelledAt() ?? null,
        createdAt: entry.getCreatedAt(),
      },
    });
  }

  async update(entry: WaitlistEntry): Promise<void> {
    await this.prisma.waitlistEntry.update({
      where: { id: entry.getId() },
      data: {
        status: toPrismaWaitlistEntryStatus(entry.getStatus()),
        notifiedAt: entry.getNotifiedAt() ?? null,
        fulfilledAt: entry.getFulfilledAt() ?? null,
        cancelledAt: entry.getCancelledAt() ?? null,
      },
    });
  }
}
