import type { HealthJourney as PrismaHealthJourneyRow, JourneyNodeLink as PrismaJourneyNodeLinkRow } from '@prisma/client';

import { HealthJourney } from '../../domain/entities/health-journey.entity.js';

import { toDomainJourneyStage } from './journey-stage.mapper.js';

export type PersistedHealthJourneyRow = PrismaHealthJourneyRow & {
  linkedNodes: PrismaJourneyNodeLinkRow[];
};

export function toDomainHealthJourney(row: PersistedHealthJourneyRow): HealthJourney {
  return HealthJourney.reconstitute({
    id: row.id,
    healthGraphId: row.healthGraphId,
    rootNodeId: row.rootNodeId,
    stage: toDomainJourneyStage(row.stage),
    linkedNodeIds: row.linkedNodes.map((link) => link.nodeId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
