import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';

import { ForbiddenError, NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetAppointmentsForDoctorAndPatientUseCase } from '../../../consultation/application/use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetConsentStateUseCase } from '../../../trust/application/use-cases/get-consent-state/get-consent-state.use-case.js';
import { RecordAuditLogCommand } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { GENERAL_CONSENT_SCOPE_CODE } from '../../../trust/domain/constants/consent-scope-codes.js';
import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';
import { ConsentState } from '../../../trust/domain/enums/consent-state.enum.js';
import { GetHealthGraphByIdUseCase } from '../../application/use-cases/get-health-graph-by-id/get-health-graph-by-id.use-case.js';
import { GetHealthJourneyByIdUseCase } from '../../application/use-cases/get-health-journey-by-id/get-health-journey-by-id.use-case.js';
import { UpdateJourneyStageCommand } from '../../application/use-cases/update-journey-stage/update-journey-stage.command.js';
import { UpdateJourneyStageUseCase } from '../../application/use-cases/update-journey-stage/update-journey-stage.use-case.js';
import { HealthJourneyResponseDto } from '../dto/health-journey-response.dto.js';
import { UpdateJourneyStageRequestDto } from '../dto/update-journey-stage-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5):
// UpdateJourneyStageUseCase has existed since this module's own Health
// Journey work but was never reachable via any route -- every journey was
// permanently stuck at its creation stage. This is that missing HTTP
// surface. docs/01.1-prd-update.md:73 -- "only the treating doctor updates
// journey stage" -- so this is Doctor-only, and the same DOCTOR-OWNED
// ENCOUNTERS ONLY + consent check every other clinical read/write in this
// module already uses (HealthGraphController.ensureReadableByCaller,
// DoctorPatientChartController.requireRelationship): a real appointment
// relationship with the journey's owning patient is required (else an
// ownership-safe 404), and consent must not be revoked (else 403
// CONSENT_NOT_GRANTED) -- reused, not reinvented.
@Controller('journeys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class JourneyController {
  constructor(
    private readonly getHealthJourneyByIdUseCase: GetHealthJourneyByIdUseCase,
    private readonly getHealthGraphByIdUseCase: GetHealthGraphByIdUseCase,
    private readonly updateJourneyStageUseCase: UpdateJourneyStageUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getAppointmentsForDoctorAndPatientUseCase: GetAppointmentsForDoctorAndPatientUseCase,
    private readonly getConsentStateUseCase: GetConsentStateUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
  ) {}

  @Patch(':id')
  async updateStage(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateJourneyStageRequestDto,
  ): Promise<ResponseEnvelope<HealthJourneyResponseDto>> {
    try {
      const journey = await this.getHealthJourneyByIdUseCase.execute({ healthJourneyId: id });
      if (!journey) {
        throw new NotFoundError(`HealthJourney "${id}" not found.`);
      }

      const graph = await this.getHealthGraphByIdUseCase.execute({ healthGraphId: journey.getHealthGraphId() });
      if (!graph) {
        throw new NotFoundError(`HealthJourney "${id}" not found.`);
      }

      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!doctorProfile) {
        throw new NotFoundError(`HealthJourney "${id}" not found.`);
      }

      const ownAppointments = await this.getAppointmentsForDoctorAndPatientUseCase.execute({
        doctorId: doctorProfile.getId(),
        patientId: graph.getPatientId(),
      });
      if (ownAppointments.length === 0) {
        throw new NotFoundError(`HealthJourney "${id}" not found.`);
      }

      const consentState = await this.getConsentStateUseCase.execute({
        patientId: graph.getPatientId(),
        doctorId: doctorProfile.getId(),
        scopeCode: GENERAL_CONSENT_SCOPE_CODE,
      });
      if (consentState === ConsentState.Revoked) {
        throw new ForbiddenError('This doctor does not have consent to update this journey.', 'CONSENT_NOT_GRANTED');
      }

      const updated = await this.updateJourneyStageUseCase.execute(
        new UpdateJourneyStageCommand({ healthJourneyId: id, nextStage: body.stage }),
      );

      const rootNode = graph.getNodes().find((node) => node.getId() === updated.getRootNodeId());
      if (!rootNode) {
        throw new Error(`Data integrity violation: HealthJourney "${updated.getId()}" root node not found.`);
      }

      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.JourneyStageUpdated,
          subjectType: 'health_journey',
          subjectId: id,
          metadata: { stage: body.stage },
        }),
      );

      return envelope(HealthJourneyResponseDto.fromDomain(updated, rootNode));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }
}
