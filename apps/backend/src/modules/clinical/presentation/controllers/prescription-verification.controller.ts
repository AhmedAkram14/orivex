import { Controller, Get, Param } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { VerifyPrescriptionUseCase } from '../../application/use-cases/verify-prescription/verify-prescription.use-case.js';
import { VerifyPrescriptionResponseDto } from '../dto/verify-prescription-response.dto.js';

// I12 -- Prescription digital signature and verification marker (ORIVEX
// Remaining Work Audit): a real, public, unauthenticated read -- the whole
// point of the PDF's QR code is that a pharmacy who has never logged into
// this platform can still confirm authenticity. Deliberately a separate
// controller (not a method on the authenticated PrescriptionController):
// no @UseGuards() at all, and the distinct two-segment path
// (/prescriptions/verify/:code) never collides with
// PrescriptionController's single-segment /prescriptions/:id route.
@Controller('prescriptions/verify')
export class PrescriptionVerificationController {
  constructor(private readonly verifyPrescriptionUseCase: VerifyPrescriptionUseCase) {}

  @Get(':code')
  async verify(@Param('code') code: string): Promise<ResponseEnvelope<VerifyPrescriptionResponseDto>> {
    const result = await this.verifyPrescriptionUseCase.execute({ verificationCode: code });
    return envelope(VerifyPrescriptionResponseDto.fromResult(result));
  }
}
