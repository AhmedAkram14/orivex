import type {
  EmergencyContact as PrismaEmergencyContactRow,
  PatientProfile as PrismaPatientProfileRow,
} from '@prisma/client';

import { EmergencyContact } from '../../domain/entities/emergency-contact.entity.js';
import { PatientProfile } from '../../domain/entities/patient-profile.entity.js';
import type { BloodType } from '../../domain/enums/blood-type.enum.js';

import { toDomainEmergencyRelationship } from './emergency-relationship.mapper.js';

export type PersistedPatientProfileRow = PrismaPatientProfileRow & {
  emergencyContacts: PrismaEmergencyContactRow[];
};

export function toDomainPatientProfile(row: PersistedPatientProfileRow): PatientProfile {
  return PatientProfile.reconstitute({
    id: row.id,
    accountId: row.accountId,
    emergencyContacts: row.emergencyContacts.map((contact) =>
      EmergencyContact.reconstitute({
        id: contact.id,
        name: contact.name,
        relationship: toDomainEmergencyRelationship(contact.relationship),
        phoneNumber: contact.phoneNumber,
      }),
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    bloodType: (row.bloodType as BloodType | null) ?? undefined,
    allergies: row.allergies ?? undefined,
    chronicDiseases: row.chronicDiseases ?? undefined,
    insuranceProviderId: row.insuranceProviderId ?? undefined,
  });
}
