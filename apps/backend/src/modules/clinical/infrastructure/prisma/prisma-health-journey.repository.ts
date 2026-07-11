import { Injectable } from '@nestjs/common';
import { JourneyStage as PrismaJourneyStage } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { HealthJourney } from '../../domain/entities/health-journey.entity.js';
import type { HealthJourneyRepository } from '../../domain/repositories/health-journey.repository.js';

import { toDomainHealthJourney } from './health-journey.mapper.js';
import { toPrismaJourneyStage } from './journey-stage.mapper.js';

const INCLUDE_LINKED_NODES = { linkedNodes: true } as const;

function parsePrismaJourneyStage(status: string): PrismaJourneyStage | undefined {
  return Object.values(PrismaJourneyStage).find((value) => value === status.toUpperCase());
}

@Injectable()
export class PrismaHealthJourneyRepository implements HealthJourneyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<HealthJourney | null> {
    const row = await this.prisma.healthJourney.findUnique({ where: { id }, include: INCLUDE_LINKED_NODES });
    return row ? toDomainHealthJourney(row) : null;
  }

  // status is validated leniently: an unrecognized value is treated as "no
  // filter" rather than a hard error -- docs/12-openapi.md's listHealthJourneys
  // documents this query parameter as a plain string, not a constrained enum.
  async findByHealthGraphId(healthGraphId: string, status?: string): Promise<HealthJourney[]> {
    const stage = status ? parsePrismaJourneyStage(status) : undefined;
    const rows = await this.prisma.healthJourney.findMany({
      where: { healthGraphId, ...(stage ? { stage } : {}) },
      include: INCLUDE_LINKED_NODES,
    });
    return rows.map(toDomainHealthJourney);
  }

  async save(journey: HealthJourney): Promise<void> {
    const id = journey.getId();
    const data = {
      healthGraphId: journey.getHealthGraphId(),
      rootNodeId: journey.getRootNodeId(),
      stage: toPrismaJourneyStage(journey.getStage()),
    };

    await this.prisma.healthJourney.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });

    await this.prisma.journeyNodeLink.deleteMany({ where: { journeyId: id } });
    if (journey.getLinkedNodeIds().length > 0) {
      await this.prisma.journeyNodeLink.createMany({
        data: journey.getLinkedNodeIds().map((nodeId) => ({ journeyId: id, nodeId })),
        skipDuplicates: true,
      });
    }
  }
}
