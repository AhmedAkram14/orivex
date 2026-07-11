import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { GetHealthGraphSubgraphUseCase } from '../../application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ListHealthJourneysUseCase } from '../../application/use-cases/list-health-journeys/list-health-journeys.use-case.js';
import { HealthGraphNodeResponseDto } from '../dto/health-graph-node-response.dto.js';
import { HealthJourneyResponseDto } from '../dto/health-journey-response.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Matches docs/12-openapi.md's GET /patients/{id}/health-graph and
// GET /patients/{id}/journeys exactly.
@Controller('patients')
export class HealthGraphController {
  constructor(
    private readonly getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
    private readonly listHealthJourneysUseCase: ListHealthJourneysUseCase,
  ) {}

  @Get(':id/health-graph')
  async getHealthGraph(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('rootNodeId') rootNodeId?: string,
  ): Promise<ResponseEnvelope<HealthGraphNodeResponseDto[]>> {
    try {
      const nodes = await this.getHealthGraphSubgraphUseCase.execute({ patientId: id, rootNodeId });
      return envelope(nodes.map((node) => HealthGraphNodeResponseDto.fromDomain(node)));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  @Get(':id/journeys')
  async listJourneys(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
  ): Promise<ResponseEnvelope<HealthJourneyResponseDto[]>> {
    try {
      const [journeys, nodes] = await Promise.all([
        this.listHealthJourneysUseCase.execute({ patientId: id, status }),
        this.getHealthGraphSubgraphUseCase.execute({ patientId: id }),
      ]);

      const nodesById = new Map(nodes.map((node) => [node.getId(), node]));
      const dtos = journeys.map((journey) => {
        const rootNode = nodesById.get(journey.getRootNodeId());
        if (!rootNode) {
          throw new Error(`Data integrity violation: HealthJourney "${journey.getId()}" root node not found.`);
        }
        return HealthJourneyResponseDto.fromDomain(journey, rootNode);
      });

      return envelope(dtos);
    } catch (error) {
      throw mapClinicalError(error);
    }
  }
}
