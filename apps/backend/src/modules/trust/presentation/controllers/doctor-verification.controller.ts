import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { ForbiddenError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { ListVerificationCasesForDoctorUseCase } from '../../application/use-cases/list-verification-cases-for-doctor/list-verification-cases-for-doctor.use-case.js';
import { SubmitDoctorVerificationCommand } from '../../application/use-cases/submit-doctor-verification/submit-doctor-verification.command.js';
import { SubmitDoctorVerificationUseCase } from '../../application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import { SubmitDoctorVerificationRequestDto } from '../dto/submit-doctor-verification-request.dto.js';
import { VerificationCaseResponseDto } from '../dto/verification-case-response.dto.js';
import { mapTrustError } from '../mappers/trust-exception.mapper.js';

// Matches docs/12-openapi.md's POST /doctors/{id}/verifications exactly,
// plus a GET sibling (Doctor Onboarding, Phase 4 continuation) for the
// applicant's own status/history view. A doctor may only submit/view
// verification cases for their own profile -- gated to Patient OR Doctor
// (every account starts and stays Patient through Draft/Pending/Rejected;
// see DoctorProfileController's own comment on this exact guard widening)
// plus an ownership check against :id.
@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient, AccountRole.Doctor)
export class DoctorVerificationController {
  constructor(
    private readonly submitDoctorVerificationUseCase: SubmitDoctorVerificationUseCase,
    private readonly listVerificationCasesForDoctorUseCase: ListVerificationCasesForDoctorUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  @Post(':id/verifications')
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitDoctorVerificationRequestDto,
  ): Promise<ResponseEnvelope<VerificationCaseResponseDto>> {
    try {
      await this.ensureOwnProfile(user, id);
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

  @Get(':id/verifications')
  async list(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<VerificationCaseResponseDto[]>> {
    try {
      await this.ensureOwnProfile(user, id);
      const cases = await this.listVerificationCasesForDoctorUseCase.execute({ doctorId: id });
      return envelope(cases.map((verificationCase) => VerificationCaseResponseDto.fromDomain(verificationCase)));
    } catch (error) {
      throw mapTrustError(error);
    }
  }

  private async ensureOwnProfile(user: AccessTokenClaims, doctorId: string): Promise<void> {
    const ownProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!ownProfile || ownProfile.getId() !== doctorId) {
      throw new ForbiddenError('Cannot access verifications for another doctor\'s profile.');
    }
  }
}
