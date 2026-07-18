import { Body, Controller, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { ForbiddenError, NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAISuggestionByIdUseCase } from '../../application/use-cases/get-ai-suggestion-by-id/get-ai-suggestion-by-id.use-case.js';
import { RecordDoctorDecisionCommand } from '../../application/use-cases/record-doctor-decision/record-doctor-decision.command.js';
import { RecordDoctorDecisionUseCase } from '../../application/use-cases/record-doctor-decision/record-doctor-decision.use-case.js';
import { RequestAISuggestionCommand } from '../../application/use-cases/request-ai-suggestion/request-ai-suggestion.command.js';
import { RequestAISuggestionUseCase } from '../../application/use-cases/request-ai-suggestion/request-ai-suggestion.use-case.js';
import { AISuggestionResponseDto } from '../dto/ai-suggestion-response.dto.js';
import { RecordDoctorDecisionRequestDto } from '../dto/record-doctor-decision-request.dto.js';
import { RequestAISuggestionRequestDto } from '../dto/request-ai-suggestion-request.dto.js';
import { mapAIError } from '../mappers/ai-exception.mapper.js';

// Matches docs/12-openapi.md's POST /ai/suggestions (requestAISuggestion) and
// PATCH /ai/suggestions/{id} (recordDoctorDecision) exactly. Both are
// treating-doctor-only actions -- gated to AccountRole.Doctor plus an
// ownership check against the underlying consultation's appointment.
@Controller('ai/suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class AISuggestionController {
  constructor(
    private readonly requestAISuggestionUseCase: RequestAISuggestionUseCase,
    private readonly recordDoctorDecisionUseCase: RecordDoctorDecisionUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getAISuggestionByIdUseCase: GetAISuggestionByIdUseCase,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
  ) {}

  @Post()
  async request(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: RequestAISuggestionRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseEnvelope<AISuggestionResponseDto | { status: string; warnings: string[] }>> {
    try {
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!doctorProfile) {
        throw new NotFoundError('No doctor profile exists for this account.');
      }
      const result = await this.requestAISuggestionUseCase.execute(
        new RequestAISuggestionCommand({
          consultationSessionId: body.consultationSessionId,
          suggestionType: body.suggestionType,
          requestingDoctorId: doctorProfile.getId(),
        }),
      );

      if (result.kind === 'unavailable') {
        res.status(HttpStatus.ACCEPTED);
        return envelope({ status: 'unavailable', warnings: result.warnings });
      }

      res.status(HttpStatus.OK);
      return envelope(AISuggestionResponseDto.fromDomain(result.suggestion));
    } catch (error) {
      throw mapAIError(error);
    }
  }

  @Patch(':id')
  async recordDecision(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordDoctorDecisionRequestDto,
  ): Promise<ResponseEnvelope<AISuggestionResponseDto>> {
    try {
      await this.ensureOwnedByCaller(id, user);
      const suggestion = await this.recordDoctorDecisionUseCase.execute(
        new RecordDoctorDecisionCommand({
          suggestionId: id,
          decision: body.decision,
          justification: body.justification,
        }),
      );
      return envelope(AISuggestionResponseDto.fromDomain(suggestion));
    } catch (error) {
      throw mapAIError(error);
    }
  }

  private async ensureOwnedByCaller(suggestionId: string, user: AccessTokenClaims): Promise<void> {
    const suggestion = await this.getAISuggestionByIdUseCase.execute({ suggestionId });
    if (!suggestion) {
      throw new NotFoundError(`AISuggestion "${suggestionId}" not found.`);
    }
    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: suggestion.getConsultationSessionId(),
    });
    if (!session) {
      throw new NotFoundError(`AISuggestion "${suggestionId}" not found.`);
    }
    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!appointment || !doctorProfile || appointment.getDoctorId() !== doctorProfile.getId()) {
      throw new ForbiddenError('Only the treating doctor for this consultation may decide on an AI suggestion.');
    }
  }
}
