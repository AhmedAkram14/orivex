import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { TreatingRelationshipService } from '../../../consultation/application/services/treating-relationship.service.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { RecordAuditLogCommand } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';
import { RecordDiagnosisCommand } from '../../application/use-cases/record-diagnosis/record-diagnosis.command.js';
import { RecordDiagnosisUseCase } from '../../application/use-cases/record-diagnosis/record-diagnosis.use-case.js';
import { GetHealthGraphSubgraphUseCase } from '../../application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ListHealthJourneysUseCase } from '../../application/use-cases/list-health-journeys/list-health-journeys.use-case.js';
import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import { AddPatientConditionRequestDto } from '../dto/add-patient-condition-request.dto.js';
import { HealthGraphNodeResponseDto } from '../dto/health-graph-node-response.dto.js';
import { HealthJourneyResponseDto } from '../dto/health-journey-response.dto.js';
import { RecordDiagnosisResponseDto } from '../dto/record-diagnosis-response.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Matches docs/12-openapi.md's GET /patients/{id}/health-graph and
// GET /patients/{id}/journeys exactly. A Doctor may only read a patient's
// graph if they (1) have a real treating relationship with that patient (an
// appointment together) -- the same DOCTOR-OWNED ENCOUNTERS ONLY primitive
// DoctorPatientChartController.requireRelationship already uses, reused
// rather than reinvented -- AND (2) the patient has not revoked consent for
// this doctor (ORIVEX Remaining Work Audit, P0 C3). These are deliberately
// distinct failure modes: no relationship at all is an ownership-safe 404
// (never reveal the patient exists to a stranger); a real relationship with
// consent explicitly revoked is a 403 CONSENT_NOT_GRANTED (the patient's
// existence to this doctor is already legitimate, access is just blocked) --
// matches docs/12-openapi.md's Forbidden response exactly. A Patient may
// only read their own (:id must match their own profile).
//
// Audit trail gap fix (ORIVEX Remaining Work Audit, P0 C2): every
// successful read here is a real PHI access and is now recorded -- only
// after ensureReadableByCaller passes, so a rejected read (404 or 403)
// never pollutes the trail with an access that didn't actually happen.
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthGraphController {
  constructor(
    private readonly getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
    private readonly listHealthJourneysUseCase: ListHealthJourneysUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly treatingRelationshipService: TreatingRelationshipService,
    private readonly recordDiagnosisUseCase: RecordDiagnosisUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
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
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.HealthGraphRead,
          subjectType: 'patient',
          subjectId: id,
          metadata: { rootNodeId: rootNodeId ?? null },
        }),
      );
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
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.HealthJourneysRead,
          subjectType: 'patient',
          subjectId: id,
          metadata: { status: status ?? null },
        }),
      );

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

  // Doctor Patient Chart plan, 4.1: a doctor-authored condition entry added
  // directly from the chart's Medical History tab, outside any consultation
  // session. Doctor-only -- the existing GET routes above allow both roles
  // via ensureReadableByCaller's own internal branch, but a write is never a
  // patient action. Reuses RecordDiagnosisUseCase (already supports
  // session-less recording) with nodeType=Condition, no consultationSessionId,
  // no startJourney (this route must never silently start a Health Journey).
  @Post(':id/health-graph/conditions')
  @Roles(AccountRole.Doctor)
  @HttpCode(HttpStatus.CREATED)
  async addCondition(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddPatientConditionRequestDto,
  ): Promise<ResponseEnvelope<RecordDiagnosisResponseDto>> {
    try {
      const { doctorProfile } = await this.treatingRelationshipService.assertActiveRelationship(user.accountId, id);
      const result = await this.recordDiagnosisUseCase.execute(
        new RecordDiagnosisCommand({
          patientId: id,
          doctorId: doctorProfile.getId(),
          nodeType: HealthGraphNodeType.Condition,
          freeTextDescription: body.freeTextDescription,
          certaintyLevel: body.certaintyLevel,
        }),
      );
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.PatientChartConditionAdded,
          subjectType: 'patient',
          subjectId: id,
          metadata: { healthGraphNodeId: result.node.getId() },
        }),
      );
      return envelope(RecordDiagnosisResponseDto.fromResult(result));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }

  private async ensureReadableByCaller(patientId: string, user: AccessTokenClaims): Promise<void> {
    if (user.role === AccountRole.Doctor) {
      await this.treatingRelationshipService.assertActiveRelationship(user.accountId, patientId);
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
