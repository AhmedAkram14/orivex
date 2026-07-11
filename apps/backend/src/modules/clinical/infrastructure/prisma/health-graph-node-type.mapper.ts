import { HealthGraphNodeType as PrismaHealthGraphNodeType } from '@prisma/client';

import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's HealthGraphNode.nodeType
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<HealthGraphNodeType, PrismaHealthGraphNodeType> = {
  [HealthGraphNodeType.Condition]: PrismaHealthGraphNodeType.CONDITION,
  [HealthGraphNodeType.Symptom]: PrismaHealthGraphNodeType.SYMPTOM,
  [HealthGraphNodeType.Medication]: PrismaHealthGraphNodeType.MEDICATION,
  [HealthGraphNodeType.LabResult]: PrismaHealthGraphNodeType.LAB_RESULT,
  [HealthGraphNodeType.RadiologyResult]: PrismaHealthGraphNodeType.RADIOLOGY_RESULT,
};

const PRISMA_TO_DOMAIN: Record<PrismaHealthGraphNodeType, HealthGraphNodeType> = {
  [PrismaHealthGraphNodeType.CONDITION]: HealthGraphNodeType.Condition,
  [PrismaHealthGraphNodeType.SYMPTOM]: HealthGraphNodeType.Symptom,
  [PrismaHealthGraphNodeType.MEDICATION]: HealthGraphNodeType.Medication,
  [PrismaHealthGraphNodeType.LAB_RESULT]: HealthGraphNodeType.LabResult,
  [PrismaHealthGraphNodeType.RADIOLOGY_RESULT]: HealthGraphNodeType.RadiologyResult,
};

export function toPrismaHealthGraphNodeType(value: HealthGraphNodeType): PrismaHealthGraphNodeType {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainHealthGraphNodeType(value: PrismaHealthGraphNodeType): HealthGraphNodeType {
  return PRISMA_TO_DOMAIN[value];
}
