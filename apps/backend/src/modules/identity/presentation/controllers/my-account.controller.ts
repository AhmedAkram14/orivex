import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { GetAccountByIdUseCase } from '../../application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { UpdatePersonalProfileCommand } from '../../application/use-cases/update-personal-profile/update-personal-profile.command.js';
import { UpdatePersonalProfileUseCase } from '../../application/use-cases/update-personal-profile/update-personal-profile.use-case.js';
import { AccountResponseDto } from '../dto/account-response.dto.js';
import { UpdatePersonalProfileRequestDto } from '../dto/update-personal-profile-request.dto.js';
import { mapIdentityError } from '../mappers/identity-exception.mapper.js';

// Onboarding Redesign (2026-07-21 proposal, §0a/§14 Stage O.1): the
// self-service "my own account" surface -- deliberately a separate
// controller from AccountController, which is entirely SuperAdmin-gated
// admin provisioning (see its own header comment) and was never meant to
// carry a "log in and edit yourself" route. Any authenticated account
// (Patient mid-onboarding, Doctor editing their profile) reaches this one.
// Backs the shared "Personal Info" step both onboarding wizards submit
// through (§0a: one entity/endpoint, not duplicated per Patient/Doctor).
@Controller('accounts/me')
@UseGuards(JwtAuthGuard)
export class MyAccountController {
  constructor(
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly updatePersonalProfileUseCase: UpdatePersonalProfileUseCase,
  ) {}

  @Get()
  async getMyAccount(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<AccountResponseDto>> {
    const account = await this.getAccountByIdUseCase.execute({ accountId: user.accountId });
    if (!account) {
      throw new NotFoundError(`Account "${user.accountId}" not found.`);
    }
    return envelope(AccountResponseDto.fromDomain(account));
  }

  @Patch()
  async updateMyPersonalProfile(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: UpdatePersonalProfileRequestDto,
  ): Promise<ResponseEnvelope<AccountResponseDto>> {
    try {
      const account = await this.updatePersonalProfileUseCase.execute(
        new UpdatePersonalProfileCommand({
          accountId: user.accountId,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          gender: body.gender,
          nationalityId: body.nationalityId,
          address: body.address,
        }),
      );
      return envelope(AccountResponseDto.fromDomain(account));
    } catch (error) {
      throw mapIdentityError(error);
    }
  }
}
