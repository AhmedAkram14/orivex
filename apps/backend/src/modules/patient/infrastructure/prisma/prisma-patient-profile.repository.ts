import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { PatientProfile } from '../../domain/entities/patient-profile.entity.js';
import { InsuranceProviderNotFoundError } from '../../domain/exceptions/insurance-provider-not-found.error.js';
import type { PatientProfileRepository } from '../../domain/repositories/patient-profile.repository.js';

import { toPrismaEmergencyRelationship } from './emergency-relationship.mapper.js';
import { toDomainPatientProfile } from './patient-profile.mapper.js';

const INCLUDE_EMERGENCY_CONTACTS = { emergencyContacts: true } as const;

// A patient-supplied insuranceProviderId that doesn't exist -- caught at the
// database FK rather than a second cross-module existence query
// (PatientModule deliberately does not import ReferenceModule).
function isForeignKeyConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}

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

    try {
      await this.prisma.$transaction([
        this.prisma.patientProfile.upsert({
          where: { id },
          create: {
            id,
            accountId: profile.getAccountId(),
            bloodType: profile.getBloodType() ?? null,
            allergies: profile.getAllergies() ?? null,
            chronicDiseases: profile.getChronicDiseases() ?? null,
            insuranceProviderId: profile.getInsuranceProviderId() ?? null,
          },
          update: {
            bloodType: profile.getBloodType() ?? null,
            allergies: profile.getAllergies() ?? null,
            chronicDiseases: profile.getChronicDiseases() ?? null,
            insuranceProviderId: profile.getInsuranceProviderId() ?? null,
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
    } catch (error) {
      if (isForeignKeyConstraintViolation(error) && profile.getInsuranceProviderId()) {
        throw new InsuranceProviderNotFoundError(profile.getInsuranceProviderId() as string);
      }
      throw error;
    }
  }
}
