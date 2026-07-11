import { EmergencyRelationship as PrismaEmergencyRelationship } from '@prisma/client';

import { EmergencyRelationship } from '../../domain/enums/emergency-relationship.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<EmergencyRelationship, PrismaEmergencyRelationship> = {
  [EmergencyRelationship.Parent]: PrismaEmergencyRelationship.PARENT,
  [EmergencyRelationship.Spouse]: PrismaEmergencyRelationship.SPOUSE,
  [EmergencyRelationship.Sibling]: PrismaEmergencyRelationship.SIBLING,
  [EmergencyRelationship.Child]: PrismaEmergencyRelationship.CHILD,
  [EmergencyRelationship.Guardian]: PrismaEmergencyRelationship.GUARDIAN,
  [EmergencyRelationship.Other]: PrismaEmergencyRelationship.OTHER,
};

const PRISMA_TO_DOMAIN: Record<PrismaEmergencyRelationship, EmergencyRelationship> = {
  [PrismaEmergencyRelationship.PARENT]: EmergencyRelationship.Parent,
  [PrismaEmergencyRelationship.SPOUSE]: EmergencyRelationship.Spouse,
  [PrismaEmergencyRelationship.SIBLING]: EmergencyRelationship.Sibling,
  [PrismaEmergencyRelationship.CHILD]: EmergencyRelationship.Child,
  [PrismaEmergencyRelationship.GUARDIAN]: EmergencyRelationship.Guardian,
  [PrismaEmergencyRelationship.OTHER]: EmergencyRelationship.Other,
};

export function toPrismaEmergencyRelationship(value: EmergencyRelationship): PrismaEmergencyRelationship {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainEmergencyRelationship(value: PrismaEmergencyRelationship): EmergencyRelationship {
  return PRISMA_TO_DOMAIN[value];
}
