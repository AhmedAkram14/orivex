import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { SubmitDoctorVerificationCommand } from '../../application/use-cases/submit-doctor-verification/submit-doctor-verification.command.js';
import { SubmitDoctorVerificationUseCase } from '../../application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import { SubmitDoctorVerificationRequestDto } from '../dto/submit-doctor-verification-request.dto.js';
import { VerificationCaseResponseDto } from '../dto/verification-case-response.dto.js';
import { mapTrustError } from '../mappers/trust-exception.mapper.js';

// Matches docs/12-openapi.md's POST /doctors/{id}/verifications exactly.
@Controller('doctors')
export class DoctorVerificationController {
  constructor(private readonly submitDoctorVerificationUseCase: SubmitDoctorVerificationUseCase) {}

  @Post(':id/verifications')
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitDoctorVerificationRequestDto,
  ): Promise<ResponseEnvelope<VerificationCaseResponseDto>> {
    try {
      const verificationCase = await this.submitDoctorVerificationUseCase.execute(
        new SubmitDoctorVerificationCommand({
          doctorId: id,
          licenseNumber: body.licenseNumber,
          specialtyCode: body.specialtyCode,
          documentAssetIds: body.documentAssetIds,
        }),
      );
      return envelope(VerificationCaseResponseDto.fromDomain(verificationCase));
    } catch (error) {
      throw mapTrustError(error);
    }
  }
}
