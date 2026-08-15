import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { PatientSearchResult, SearchPatientsPort } from '../../application/ports/search-patients.port.js';

// Hard rule: every Prisma call below uses an explicit `select` that never
// names bloodType/allergies/chronicDiseases/insuranceProviderId -- Prisma's
// default (no `select`) would otherwise return every PatientProfile scalar
// column, including those clinical fields, even if the mapped result
// discards them. `select` keeps them out of the query itself.
@Injectable()
export class PrismaSearchPatientsQueryService implements SearchPatientsPort {
  constructor(private readonly prisma: PrismaService) {}

  // Doctor caller: scoped to exactly the same "this doctor has a real
  // appointment with them" relationship
  // DoctorAppointmentsController#getDoctorPatients computes (distinct
  // patients from Appointment WHERE doctorId = caller). The `appointments:
  // { some: { doctorId } }` relation filter is the same real join expressed
  // as a WHERE-level EXISTS against Appointment (backed by its
  // @@index([doctorId]) / @@index([doctorId, scheduledAt])), not a
  // separate unscoped patient list.
  async searchForDoctor({
    doctorProfileId,
    query,
    limit,
  }: {
    doctorProfileId: string;
    query: string;
    limit: number;
  }): Promise<PatientSearchResult> {
    const where: Prisma.PatientProfileWhereInput = {
      account: { displayName: { contains: query, mode: 'insensitive' } },
      appointments: { some: { doctorId: doctorProfileId } },
    };
    return this.run(where, limit);
  }

  // SuperAdmin: platform-wide, Account.displayName only -- mirrors
  // /admin/accounts' existing unrestricted, name-only lookup.
  async searchAdmin({ query, limit }: { query: string; limit: number }): Promise<PatientSearchResult> {
    const where: Prisma.PatientProfileWhereInput = {
      account: { displayName: { contains: query, mode: 'insensitive' } },
    };
    return this.run(where, limit);
  }

  private async run(where: Prisma.PatientProfileWhereInput, limit: number): Promise<PatientSearchResult> {
    const [rows, total] = await Promise.all([
      this.prisma.patientProfile.findMany({
        where,
        select: { id: true, account: { select: { displayName: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.patientProfile.count({ where }),
    ]);

    return {
      total,
      entries: rows.map((row) => ({
        patientProfileId: row.id,
        displayName: row.account.displayName,
      })),
    };
  }
}
