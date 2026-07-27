import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { SubmitConsultationFeedbackCommand } from '../../application/use-cases/submit-consultation-feedback/submit-consultation-feedback.command.js';
import { SubmitConsultationFeedbackUseCase } from '../../application/use-cases/submit-consultation-feedback/submit-consultation-feedback.use-case.js';
import { ConsultationFeedbackResponseDto } from '../dto/consultation-feedback-response.dto.js';
import { SubmitConsultationFeedbackRequestDto } from '../dto/submit-consultation-feedback-request.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// Consultation lifecycle completion follow-up (2026-07-26): §8/§9's
// "Rate your consultation" entry point. Patient-only; every real
// authorization rule (session genuinely Completed, caller is the treating
// patient, one review per session, rating range) is enforced inside
// SubmitConsultationFeedbackUseCase, never trusted from this HTTP layer.
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient)
export class ConsultationFeedbackController {
  constructor(private readonly submitConsultationFeedbackUseCase: SubmitConsultationFeedbackUseCase) {}

  @Post(':id/feedback')
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitConsultationFeedbackRequestDto,
  ): Promise<ResponseEnvelope<ConsultationFeedbackResponseDto>> {
    try {
      const feedback = await this.submitConsultationFeedbackUseCase.execute(
        new SubmitConsultationFeedbackCommand({
          consultationSessionId: id,
          patientAccountId: user.accountId,
          rating: body.rating,
          comment: body.comment,
        }),
      );
      return envelope(ConsultationFeedbackResponseDto.fromDomain(feedback));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }
}
