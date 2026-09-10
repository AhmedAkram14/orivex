import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';

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
import { RecordHealthPassportEntryCommand } from '../../application/use-cases/record-health-passport-entry/record-health-passport-entry.command.js';
import { RecordHealthPassportEntryUseCase } from '../../application/use-cases/record-health-passport-entry/record-health-passport-entry.use-case.js';
import { ListHealthPassportEntriesForPatientUseCase } from '../../application/use-cases/list-health-passport-entries-for-patient/list-health-passport-entries-for-patient.use-case.js';
import { DeleteHealthPassportEntryCommand } from '../../application/use-cases/delete-health-passport-entry/delete-health-passport-entry.command.js';
import { DeleteHealthPassportEntryUseCase } from '../../application/use-cases/delete-health-passport-entry/delete-health-passport-entry.use-case.js';
import type { PatientProfile } from '../../domain/entities/patient-profile.entity.js';
import { PatientProfileExistsResponseDto } from '../dto/patient-profile-exists-response.dto.js';
import { PatientProfileResponseDto } from '../dto/patient-profile-response.dto.js';
import { HealthPassportEntryResponseDto } from '../dto/health-passport-entry-response.dto.js';
import { RecordHealthPassportEntryRequestDto } from '../dto/record-health-passport-entry-request.dto.js';
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
    private readonly recordHealthPassportEntryUseCase: RecordHealthPassportEntryUseCase,
    private readonly listHealthPassportEntriesForPatientUseCase: ListHealthPassportEntriesForPatientUseCase,
    private readonly deleteHealthPassportEntryUseCase: DeleteHealthPassportEntryUseCase,
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
          lifestyleNotes: body.lifestyleNotes,
          nutritionNotes: body.nutritionNotes,
          exerciseNotes: body.exerciseNotes,
          mentalHealthNotes: body.mentalHealthNotes,
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

  // I6 -- Health Passport (docs/01-prd.md L59 §2.4, docs/01.1-prd-update.md
  // §17-30): patient-authored vaccinations/family history/surgeries/current
  // medications. Own-resource, same "derive patientId from the caller's own
  // JWT, never trust a body/param" convention as every other patient-owned
  // write in this controller.
  @Post('me/health-passport-entries')
  @HttpCode(HttpStatus.CREATED)
  async recordHealthPassportEntry(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: RecordHealthPassportEntryRequestDto,
  ): Promise<ResponseEnvelope<HealthPassportEntryResponseDto>> {
    try {
      const profile = await this.myProfile(user.accountId);
      const entry = await this.recordHealthPassportEntryUseCase.execute(
        new RecordHealthPassportEntryCommand({
          patientId: profile.getId(),
          category: body.category,
          title: body.title,
          detail: body.detail,
          occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
        }),
      );
      return envelope(HealthPassportEntryResponseDto.fromDomain(entry));
    } catch (error) {
      throw mapPatientError(error);
    }
  }

  @Get('me/health-passport-entries')
  async listHealthPassportEntries(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<HealthPassportEntryResponseDto[]>> {
    const profile = await this.myProfile(user.accountId);
    const entries = await this.listHealthPassportEntriesForPatientUseCase.execute({ patientId: profile.getId() });
    return envelope(entries.map((entry) => HealthPassportEntryResponseDto.fromDomain(entry)));
  }

  @Delete('me/health-passport-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHealthPassportEntry(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    try {
      const profile = await this.myProfile(user.accountId);
      await this.deleteHealthPassportEntryUseCase.execute(
        new DeleteHealthPassportEntryCommand({ entryId: id, patientId: profile.getId() }),
      );
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
