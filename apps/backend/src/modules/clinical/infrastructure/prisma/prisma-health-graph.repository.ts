import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { HealthGraph } from '../../domain/entities/health-graph.entity.js';
import type { HealthGraphRepository } from '../../domain/repositories/health-graph.repository.js';

import { toPrismaCertaintyLevel } from './certainty-level.mapper.js';
import { toDomainHealthGraph } from './health-graph.mapper.js';
import { toPrismaHealthGraphNodeType } from './health-graph-node-type.mapper.js';
import { toPrismaNodeSource } from './node-source.mapper.js';

const INCLUDE_NODES = { nodes: true } as const;

@Injectable()
export class PrismaHealthGraphRepository implements HealthGraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<HealthGraph | null> {
    const row = await this.prisma.healthGraph.findUnique({ where: { id }, include: INCLUDE_NODES });
    return row ? toDomainHealthGraph(row) : null;
  }

  async findByPatientId(patientId: string): Promise<HealthGraph | null> {
    const row = await this.prisma.healthGraph.findUnique({ where: { patientId }, include: INCLUDE_NODES });
    return row ? toDomainHealthGraph(row) : null;
  }

  // Nodes are append-only (docs/09-physical-database.md: "never updated in
  // place") -- save() only ever inserts, using skipDuplicates so
  // previously-persisted nodes already in the in-memory aggregate are
  // silently left alone rather than re-written.
  async save(healthGraph: HealthGraph): Promise<void> {
    const id = healthGraph.getId();

    await this.prisma.healthGraph.upsert({
      where: { id },
      create: { id, patientId: healthGraph.getPatientId(), createdAt: healthGraph.getCreatedAt() },
      update: {},
    });

    await this.prisma.healthGraphNode.createMany({
      data: healthGraph.getNodes().map((node) => ({
        id: node.getId(),
        healthGraphId: id,
        nodeType: toPrismaHealthGraphNodeType(node.getNodeType()),
        freeTextDescription: node.getFreeTextDescription() ?? null,
        certaintyLevel: toPrismaCertaintyLevel(node.getCertaintyLevel()),
        source: toPrismaNodeSource(node.getSource()),
        authoringDoctorId: node.getAuthoringDoctorId() ?? null,
        consultationSessionId: node.getConsultationSessionId() ?? null,
        supersedesNodeId: node.getSupersedesNodeId() ?? null,
        createdAt: node.getCreatedAt(),
      })),
      skipDuplicates: true,
    });
  }
}
