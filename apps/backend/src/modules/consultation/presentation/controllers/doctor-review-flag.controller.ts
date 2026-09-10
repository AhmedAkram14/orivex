import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { FlagConsultationFeedbackCommand } from '../../application/use-cases/flag-consultation-feedback/flag-consultation-feedback.command.js';
import { FlagConsultationFeedbackUseCase } from '../../application/use-cases/flag-consultation-feedback/flag-consultation-feedback.use-case.js';
import { ConsultationFeedbackResponseDto } from '../dto/consultation-feedback-response.dto.js';
import { FlagConsultationFeedbackRequestDto } from '../dto/flag-consultation-feedback-request.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// I11 -- Admin content moderation (ORIVEX Remaining Work Audit): a separate
// controller (not a method added to the Patient-only ConsultationFeedback
// Controller) because this is the reviewed doctor's own action, on a
// resource keyed by feedbackId rather than consultationSessionId --
// matches this codebase's one-role-per-controller convention rather than a
// per-method @Roles override.
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class DoctorReviewFlagController {
  constructor(private readonly flagConsultationFeedbackUseCase: FlagConsultationFeedbackUseCase) {}

  @Patch(':id/flag')
  async flag(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FlagConsultationFeedbackRequestDto,
  ): Promise<ResponseEnvelope<ConsultationFeedbackResponseDto>> {
    try {
      const feedback = await this.flagConsultationFeedbackUseCase.execute(
        new FlagConsultationFeedbackCommand({ feedbackId: id, callerAccountId: user.accountId, reason: body.reason }),
      );
      return envelope(ConsultationFeedbackResponseDto.fromDomain(feedback));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }
}
