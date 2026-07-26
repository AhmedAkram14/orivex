import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { CreatePatientProfileUseCase } from '../../application/use-cases/create-patient-profile/create-patient-profile.use-case.js';
import { CreatePatientProfileCommand } from '../../application/use-cases/create-patient-profile/create-patient-profile.command.js';
import { GetPatientProfileByAccountIdUseCase } from '../../application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { UpdatePatientProfileCommand } from '../../application/use-cases/update-patient-profile/update-patient-profile.command.js';
import { UpdatePatientProfileUseCase } from '../../application/use-cases/update-patient-profile/update-patient-profile.use-case.js';
import type { PatientProfile } from '../../domain/entities/patient-profile.entity.js';
import { PatientProfileExistsResponseDto } from '../dto/patient-profile-exists-response.dto.js';
import { PatientProfileResponseDto } from '../dto/patient-profile-response.dto.js';
import { UpdatePatientProfileRequestDto } from '../dto/update-patient-profile-request.dto.js';
import { mapPatientError } from '../mappers/patient-exception.mapper.js';

// Own, additive resource -- docs/12-openapi.md documents no /patients CRUD
// contract yet (only sub-resources like /patients/{id}/consents). This is
// PatientModule's own "my profile" surface, scoped to the caller only (never
// another patient's id) since a profile carries account-level PII. Registered
// under /patients (not /patient) to match the existing plural convention
// (/doctors, /accounts) elsewhere in this backend.
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient)
export class PatientProfileController {
  constructor(
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly createPatientProfileUseCase: CreatePatientProfileUseCase,
    private readonly updatePatientProfileUseCase: UpdatePatientProfileUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  // Onboarding Redesign (2026-07-21 proposal, Stage O.5): the
  // Choose-Your-Journey gate's PatientProfile half -- a plain
  // findByAccountId read, never the lazy-create path getMyProfile()/
  // myProfile() below uses. Registered as its own sub-path so it can never
  // be confused with (or accidentally reached via) the "me" route.
  @Get('me/exists')
  async checkMyProfileExists(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<PatientProfileExistsResponseDto>> {
    const existing = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    return envelope(PatientProfileExistsResponseDto.fromResult(existing !== null));
  }

  @Get('me')
  async getMyProfile(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<PatientProfileResponseDto>> {
    const profile = await this.myProfile(user.accountId);
    const account = await this.getAccountByIdUseCase.execute({ accountId: user.accountId });
    if (!account) {
      // A validly-signed JWT implies the account existed at issuance --
      // surfaced as not-found rather than a 500 in case it was since removed.
      throw new NotFoundError(`Account "${user.accountId}" not found.`);
    }
    return envelope(PatientProfileResponseDto.fromDomain(profile, account));
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: UpdatePatientProfileRequestDto,
  ): Promise<ResponseEnvelope<PatientProfileResponseDto>> {
    try {
      const existing = await this.myProfile(user.accountId);
      const profile = await this.updatePatientProfileUseCase.execute(
        new UpdatePatientProfileCommand({
          patientProfileId: existing.getId(),
          emergencyContacts: body.emergencyContacts,
          bloodType: body.bloodType,
          allergies: body.allergies,
          chronicDiseases: body.chronicDiseases,
          insuranceProviderId: body.insuranceProviderId,
        }),
      );
      const account = await this.getAccountByIdUseCase.execute({ accountId: user.accountId });
      if (!account) {
        throw new NotFoundError(`Account "${user.accountId}" not found.`);
      }
      return envelope(PatientProfileResponseDto.fromDomain(profile, account));
    } catch (error) {
      throw mapPatientError(error);
    }
  }

  // Docs/10-backend-architecture.md describes profile creation as an
  // AccountCreated event subscriber ("PatientModule creates an empty
  // PatientProfile shell") -- that event-subscription wiring is deliberately
  // deferred (the shared DomainEventDispatcher port only exposes dispatch(),
  // not subscription, per PatientModule's own use-case comments). Lazily
  // creating the shell here on first read achieves the same real end state
  // -- every patient account ends up with exactly one real profile row --
  // without requiring that infrastructure sprint first.
  private async myProfile(accountId: string): Promise<PatientProfile> {
    const existing = await this.getPatientProfileByAccountIdUseCase.execute({ accountId });
    if (existing) {
      return existing;
    }
    return this.createPatientProfileUseCase.execute(new CreatePatientProfileCommand({ accountId }));
  }
}
