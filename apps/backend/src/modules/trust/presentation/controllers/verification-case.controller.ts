import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { DecideVerificationCommand } from '../../application/use-cases/decide-verification/decide-verification.command.js';
import { DecideVerificationUseCase } from '../../application/use-cases/decide-verification/decide-verification.use-case.js';
import { DecideVerificationRequestDto } from '../dto/decide-verification-request.dto.js';
import { VerificationCaseResponseDto } from '../dto/verification-case-response.dto.js';
import { mapTrustError } from '../mappers/trust-exception.mapper.js';

// Matches docs/12-openapi.md's PATCH /verifications/{id} exactly.
// Approving/rejecting a doctor's license verification is an administrative
// action, gated to AccountRole.SuperAdmin (renamed from AccountRole.Admin in
// ORIVEX Roadmap 2.0 Stage 4 — see account-role.enum.ts's own comment).
@Controller('verifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.SuperAdmin)
export class VerificationCaseController {
  constructor(private readonly decideVerificationUseCase: DecideVerificationUseCase) {}

  @Patch(':id')
  async decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideVerificationRequestDto,
  ): Promise<ResponseEnvelope<VerificationCaseResponseDto>> {
    try {
      const verificationCase = await this.decideVerificationUseCase.execute(
        new DecideVerificationCommand({
          verificationCaseId: id,
          status: body.status,
          reason: body.reason,
        }),
      );
      return envelope(VerificationCaseResponseDto.fromDomain(verificationCase));
    } catch (error) {
      throw mapTrustError(error);
    }
  }
}
