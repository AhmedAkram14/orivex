import type { HealthGraph as PrismaHealthGraphRow, HealthGraphNode as PrismaHealthGraphNodeRow } from '@prisma/client';

import { HealthGraphNode } from '../../domain/entities/health-graph-node.entity.js';
import { HealthGraph } from '../../domain/entities/health-graph.entity.js';

import { toDomainCertaintyLevel } from './certainty-level.mapper.js';
import { toDomainHealthGraphNodeType } from './health-graph-node-type.mapper.js';
import { toDomainNodeSource } from './node-source.mapper.js';

export type PersistedHealthGraphRow = PrismaHealthGraphRow & {
  nodes: PrismaHealthGraphNodeRow[];
};

export function toDomainHealthGraphNode(row: PrismaHealthGraphNodeRow): HealthGraphNode {
  return HealthGraphNode.reconstitute({
    id: row.id,
    nodeType: toDomainHealthGraphNodeType(row.nodeType),
    freeTextDescription: row.freeTextDescription ?? undefined,
    certaintyLevel: toDomainCertaintyLevel(row.certaintyLevel),
    source: toDomainNodeSource(row.source),
    authoringDoctorId: row.authoringDoctorId ?? undefined,
    consultationSessionId: row.consultationSessionId ?? undefined,
    supersedesNodeId: row.supersedesNodeId ?? undefined,
    createdAt: row.createdAt,
  });
}

export function toDomainHealthGraph(row: PersistedHealthGraphRow): HealthGraph {
  return HealthGraph.reconstitute({
    id: row.id,
    patientId: row.patientId,
    createdAt: row.createdAt,
    nodes: row.nodes.map(toDomainHealthGraphNode),
  });
}
