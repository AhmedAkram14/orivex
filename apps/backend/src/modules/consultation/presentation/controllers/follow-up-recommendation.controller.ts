import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { RecommendFollowUpCommand } from '../../application/use-cases/recommend-follow-up/recommend-follow-up.command.js';
import { RecommendFollowUpUseCase } from '../../application/use-cases/recommend-follow-up/recommend-follow-up.use-case.js';
import { FollowUpRecommendationResponseDto } from '../dto/follow-up-recommendation-response.dto.js';
import { RecommendFollowUpRequestDto } from '../dto/recommend-follow-up-request.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// Consultation lifecycle completion follow-up (2026-07-26): §13's minimal
// follow-up capability -- a doctor-authored recommendation (reason +
// optional suggested date), not a second booking system. The patient books
// the actual follow-up appointment through the existing real booking flow.
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class FollowUpRecommendationController {
  constructor(private readonly recommendFollowUpUseCase: RecommendFollowUpUseCase) {}

  @Post(':id/follow-up')
  @HttpCode(HttpStatus.CREATED)
  async recommend(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecommendFollowUpRequestDto,
  ): Promise<ResponseEnvelope<FollowUpRecommendationResponseDto>> {
    try {
      const recommendation = await this.recommendFollowUpUseCase.execute(
        new RecommendFollowUpCommand({
          consultationSessionId: id,
          authoringDoctorAccountId: user.accountId,
          reason: body.reason,
          recommendedDate: body.recommendedDate ? new Date(body.recommendedDate) : undefined,
        }),
      );
      return envelope(FollowUpRecommendationResponseDto.fromDomain(recommendation));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }
}
