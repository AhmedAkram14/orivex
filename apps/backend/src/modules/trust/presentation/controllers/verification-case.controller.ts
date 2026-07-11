import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { DecideVerificationCommand } from '../../application/use-cases/decide-verification/decide-verification.command.js';
import { DecideVerificationUseCase } from '../../application/use-cases/decide-verification/decide-verification.use-case.js';
import { DecideVerificationRequestDto } from '../dto/decide-verification-request.dto.js';
import { VerificationCaseResponseDto } from '../dto/verification-case-response.dto.js';
import { mapTrustError } from '../mappers/trust-exception.mapper.js';

// Matches docs/12-openapi.md's PATCH /verifications/{id} exactly.
@Controller('verifications')
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
