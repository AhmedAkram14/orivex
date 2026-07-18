import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetHealthGraphSubgraphUseCase } from '../../application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ListHealthJourneysUseCase } from '../../application/use-cases/list-health-journeys/list-health-journeys.use-case.js';
import { HealthGraphNodeResponseDto } from '../dto/health-graph-node-response.dto.js';
import { HealthJourneyResponseDto } from '../dto/health-journey-response.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Matches docs/12-openapi.md's GET /patients/{id}/health-graph and
// GET /patients/{id}/journeys exactly. Any authenticated Doctor may read any
// patient's graph (treating-relationship scoping is not modeled yet -- a
// bigger feature than this audit's guard-gap fix); a Patient may only read
// their own (:id must match their own profile).
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthGraphController {
  constructor(
    private readonly getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
    private readonly listHealthJourneysUseCase: ListHealthJourneysUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  @Get(':id/health-graph')
  async getHealthGraph(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('rootNodeId') rootNodeId?: string,
  ): Promise<ResponseEnvelope<HealthGraphNodeResponseDto[]>> {
    try {
      await this.ensureReadableByCaller(id, user);
      const nodes = await this.getHealthGraphSubgraphUseCase.execute({ patientId: id, rootNodeId });
      return envelope(nodes.map((node) => HealthGraphNodeResponseDto.fromDomain(node)));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  @Get(':id/journeys')
  async listJourneys(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
  ): Promise<ResponseEnvelope<HealthJourneyResponseDto[]>> {
    try {
      await this.ensureReadableByCaller(id, user);
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

  private async ensureReadableByCaller(patientId: string, user: AccessTokenClaims): Promise<void> {
    if (user.role === AccountRole.Doctor) {
      return;
    }
    if (user.role === AccountRole.Patient) {
      const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (patientProfile !== null && patientProfile.getId() === patientId) {
        return;
      }
    }
    throw new NotFoundError(`Patient "${patientId}" not found.`);
  }
}
