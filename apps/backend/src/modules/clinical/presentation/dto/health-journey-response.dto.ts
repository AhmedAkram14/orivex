import type { HealthGraphNode } from '../../domain/entities/health-graph-node.entity.js';
import type { HealthJourney } from '../../domain/entities/health-journey.entity.js';
import type { JourneyStage } from '../../domain/enums/journey-stage.enum.js';

import { HealthGraphNodeResponseDto } from './health-graph-node-response.dto.js';

// Matches docs/12-openapi.md's HealthJourney schema exactly.
export class HealthJourneyResponseDto {
  id!: string;
  rootNode!: HealthGraphNodeResponseDto;
  stage!: JourneyStage;
  linkedNodeIds!: string[];
  lastUpdatedAt!: string;

  static fromDomain(journey: HealthJourney, rootNode: HealthGraphNode): HealthJourneyResponseDto {
    const dto = new HealthJourneyResponseDto();
    dto.id = journey.getId();
    dto.rootNode = HealthGraphNodeResponseDto.fromDomain(rootNode);
    dto.stage = journey.getStage();
    dto.linkedNodeIds = journey.getLinkedNodeIds();
    dto.lastUpdatedAt = journey.getUpdatedAt().toISOString();
    return dto;
  }
}
