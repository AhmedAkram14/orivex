import { NodeSource as PrismaNodeSource } from '@prisma/client';

import { NodeSource } from '../../domain/enums/node-source.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's HealthGraphNode.source
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<NodeSource, PrismaNodeSource> = {
  [NodeSource.Clinical]: PrismaNodeSource.CLINICAL,
  [NodeSource.PatientReported]: PrismaNodeSource.PATIENT_REPORTED,
  [NodeSource.Device]: PrismaNodeSource.DEVICE,
};

const PRISMA_TO_DOMAIN: Record<PrismaNodeSource, NodeSource> = {
  [PrismaNodeSource.CLINICAL]: NodeSource.Clinical,
  [PrismaNodeSource.PATIENT_REPORTED]: NodeSource.PatientReported,
  [PrismaNodeSource.DEVICE]: NodeSource.Device,
};

export function toPrismaNodeSource(value: NodeSource): PrismaNodeSource {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainNodeSource(value: PrismaNodeSource): NodeSource {
  return PRISMA_TO_DOMAIN[value];
}
