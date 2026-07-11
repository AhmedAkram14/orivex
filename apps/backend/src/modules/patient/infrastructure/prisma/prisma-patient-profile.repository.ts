import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { PatientProfile } from '../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../domain/repositories/patient-profile.repository.js';

import { toPrismaEmergencyRelationship } from './emergency-relationship.mapper.js';
import { toDomainPatientProfile } from './patient-profile.mapper.js';

const INCLUDE_EMERGENCY_CONTACTS = { emergencyContacts: true } as const;

@Injectable()
export class PrismaPatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PatientProfile | null> {
    const row = await this.prisma.patientProfile.findUnique({
      where: { id },
      include: INCLUDE_EMERGENCY_CONTACTS,
    });
    return row ? toDomainPatientProfile(row) : null;
  }

  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    const row = await this.prisma.patientProfile.findUnique({
      where: { accountId },
      include: INCLUDE_EMERGENCY_CONTACTS,
    });
    return row ? toDomainPatientProfile(row) : null;
  }

  async save(profile: PatientProfile): Promise<void> {
    const id = profile.getId();

    await this.prisma.$transaction([
      this.prisma.patientProfile.upsert({
        where: { id },
        create: {
          id,
          accountId: profile.getAccountId(),
          dateOfBirth: profile.getDateOfBirth() ?? null,
        },
        update: {
          dateOfBirth: profile.getDateOfBirth() ?? null,
        },
      }),
      this.prisma.emergencyContact.deleteMany({ where: { patientProfileId: id } }),
      this.prisma.emergencyContact.createMany({
        data: profile.getEmergencyContacts().map((contact) => ({
          id: contact.getId(),
          patientProfileId: id,
          name: contact.getName(),
          relationship: toPrismaEmergencyRelationship(contact.getRelationship()),
          phoneNumber: contact.getPhoneNumber(),
        })),
      }),
    ]);
  }
}
