import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { ForbiddenError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';
import { ListVerificationCasesForSubjectUseCase } from '../../application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import { SubmitPatientVerificationCommand } from '../../application/use-cases/submit-patient-verification/submit-patient-verification.command.js';
import { SubmitPatientVerificationUseCase } from '../../application/use-cases/submit-patient-verification/submit-patient-verification.use-case.js';
import { CheckIdentityVerificationStatusUseCase } from '../../application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { IdentityVerificationStatusResponseDto } from '../dto/identity-verification-status-response.dto.js';
import { SubmitPatientVerificationRequestDto } from '../dto/submit-patient-verification-request.dto.js';
import { VerificationCaseResponseDto } from '../dto/verification-case-response.dto.js';
import { mapTrustError } from '../mappers/trust-exception.mapper.js';

// Onboarding Redesign (2026-07-21 proposal, Stage O.2/§7a): mirrors
// DoctorVerificationController exactly -- same ownership-check shape, same
// reuse of the generalized VerificationCase/review queue (no second review
// system, per explicit product decision). A Patient submits identity
// verification only when a gated action (booking, consultation, document
// upload, payment) requires it -- never as a mandatory onboarding step.
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient)
export class PatientVerificationController {
  constructor(
    private readonly submitPatientVerificationUseCase: SubmitPatientVerificationUseCase,
    private readonly listVerificationCasesForSubjectUseCase: ListVerificationCasesForSubjectUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly checkIdentityVerificationStatusUseCase: CheckIdentityVerificationStatusUseCase,
  ) {}

  // UX convenience (Onboarding Redesign, 2026-07-21 proposal, Stage O.4) --
  // lets the frontend show a "verify your identity" prompt ahead of a gated
  // action, rather than waiting for a 403 from RequiresIdentityVerificationGuard.
  // "me" is a literal path segment, distinct from the ":id/verifications"
  // routes below (different second segment), so no route-ordering hazard.
  @Get('me/identity-verification-status')
  async getMyIdentityVerificationStatus(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<IdentityVerificationStatusResponseDto>> {
    const result = await this.checkIdentityVerificationStatusUseCase.execute({
      subjectType: VerificationSubjectType.Patient,
      subjectAccountId: user.accountId,
    });
    return envelope(IdentityVerificationStatusResponseDto.fromResult(result));
  }

  @Post(':id/verifications')
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitPatientVerificationRequestDto,
  ): Promise<ResponseEnvelope<VerificationCaseResponseDto>> {
    try {
      await this.ensureOwnProfile(user, id);
      const verificationCase = await this.submitPatientVerificationUseCase.execute(
        new SubmitPatientVerificationCommand({
          patientProfileId: id,
          subjectAccountId: user.accountId,
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
      const cases = await this.listVerificationCasesForSubjectUseCase.execute({
        subjectType: VerificationSubjectType.Patient,
        subjectAccountId: user.accountId,
      });
      return envelope(cases.map((verificationCase) => VerificationCaseResponseDto.fromDomain(verificationCase)));
    } catch (error) {
      throw mapTrustError(error);
    }
  }

  private async ensureOwnProfile(user: AccessTokenClaims, patientProfileId: string): Promise<void> {
    const ownProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!ownProfile || ownProfile.getId() !== patientProfileId) {
      throw new ForbiddenError('Cannot access verifications for another patient\'s profile.');
    }
  }
}
