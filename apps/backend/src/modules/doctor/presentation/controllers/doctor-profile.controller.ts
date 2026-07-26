import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { ListDoctorDirectoryQuery } from '../../application/use-cases/list-doctor-directory/list-doctor-directory.query.js';
import { ListDoctorDirectoryUseCase } from '../../application/use-cases/list-doctor-directory/list-doctor-directory.use-case.js';
import { RegisterDoctorProfileCommand } from '../../application/use-cases/register-doctor-profile/register-doctor-profile.command.js';
import { RegisterDoctorProfileUseCase } from '../../application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { UpdateDoctorProfileCommand } from '../../application/use-cases/update-doctor-profile/update-doctor-profile.command.js';
import { UpdateDoctorProfileUseCase } from '../../application/use-cases/update-doctor-profile/update-doctor-profile.use-case.js';
import type { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import { DoctorDirectoryResponseDto } from '../dto/doctor-directory-response.dto.js';
import { DoctorProfileResponseDto } from '../dto/doctor-profile-response.dto.js';
import { ListDoctorDirectoryQueryDto } from '../dto/list-doctor-directory-query.dto.js';
import { RegisterDoctorProfileRequestDto } from '../dto/register-doctor-profile-request.dto.js';
import { UpdateDoctorProfileRequestDto } from '../dto/update-doctor-profile-request.dto.js';
import { mapDoctorError } from '../mappers/doctor-exception.mapper.js';

// GET /doctors (no id) is real now (Onboarding Redesign, 2026-07-21 proposal
// §5/§9/§14 Stage O.1) -- a deliberately minimal list/filter endpoint (specialty
// contains-match + hospitalId, paginated) backing the Patient Dashboard's
// Browse/Search Doctors screens. Not full-text search or the richer
// composited GET /doctors/{id}/portfolio (Trust/Availability/Reviews
// composition) -- both remain Stage 8/future work; this is intentionally
// narrow, see ListDoctorDirectoryUseCase's own header comment.
//
// GET/PATCH /doctors/me are the caller's own "my profile" surface (mirrors
// PatientProfileController's /patients/me). Guarded to Patient OR Doctor
// (Doctor Onboarding, Phase 4 continuation): every account starts as
// Patient and stays Patient through the entire Draft/Pending/Rejected
// onboarding lifecycle -- only an *approved* verification promotes the
// account to Doctor (see DoctorModule's PromoteDoctorRoleOnVerification
// Handler, subscribed to TrustModule's 'doctor.verified' event). Widening
// this guard is what lets a still-Patient applicant call POST /doctors,
// GET/PATCH /doctors/me, and POST /doctors/:id/verifications at all --
// every other Doctor-only route in the codebase (schedule, queue,
// consultations, prescriptions, etc.) is intentionally untouched, so a
// Pending/Rejected applicant still cannot reach any real Doctor Portal
// feature; only the profile/verification self-service surface is shared.
// Unlike Patient, a missing profile is NOT lazily created here: registering
// a DoctorProfile requires a real licenseNumber + specialty (RegisterDoctor
// ProfileUseCase), and there is no honest default to fabricate for either —
// so "me" routes 404 until POST /doctors has been called for this account.
@Controller('doctors')
export class DoctorProfileController {
  constructor(
    private readonly registerDoctorProfileUseCase: RegisterDoctorProfileUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly updateDoctorProfileUseCase: UpdateDoctorProfileUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly listDoctorDirectoryUseCase: ListDoctorDirectoryUseCase,
  ) {}

  // Gated to any authenticated account (not fully public like GET /doctors/:id
  // below) per the approved proposal §5 -- a Patient mid-onboarding still
  // needs to be logged in to browse, and this deliberately doesn't open a
  // second, unauthenticated way to enumerate every doctor on the platform.
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Query() query: ListDoctorDirectoryQueryDto): Promise<ResponseEnvelope<DoctorDirectoryResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const result = await this.listDoctorDirectoryUseCase.execute(
      new ListDoctorDirectoryQuery({
        page,
        limit,
        specialty: query.specialty,
        specialtyId: query.specialtyId,
        hospitalId: query.hospitalId,
      }),
    );
    return envelope(DoctorDirectoryResponseDto.fromResult(result, page, limit));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Patient, AccountRole.Doctor)
  async register(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: RegisterDoctorProfileRequestDto,
  ): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const profile = await this.registerDoctorProfileUseCase.execute(
        new RegisterDoctorProfileCommand({
          accountId: user.accountId,
          licenseNumber: body.licenseNumber,
          specialty: body.specialty,
          biography: body.biography,
          yearsOfExperience: body.yearsOfExperience,
          languages: body.languages,
          consultationFeeAmount: body.consultationFeeAmount,
          hospitalId: body.hospitalId,
          publications: body.publications,
          awards: body.awards,
          specialtyId: body.specialtyId,
          professionalRank: body.professionalRank,
          licenseExpiryDate: body.licenseExpiryDate ? new Date(body.licenseExpiryDate) : undefined,
          departmentId: body.departmentId,
        }),
      );
      const account = await this.getAccountOrThrow(profile.getAccountId());
      return envelope(DoctorProfileResponseDto.fromDomain(profile, account));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Patient, AccountRole.Doctor)
  async getMyProfile(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const profile = await this.myProfileOrThrow(user.accountId);
      const account = await this.getAccountOrThrow(user.accountId);
      return envelope(DoctorProfileResponseDto.fromDomain(profile, account));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Patient, AccountRole.Doctor)
  async updateMyProfile(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: UpdateDoctorProfileRequestDto,
  ): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const existing = await this.myProfileOrThrow(user.accountId);
      const profile = await this.updateDoctorProfileUseCase.execute(
        new UpdateDoctorProfileCommand({
          doctorProfileId: existing.getId(),
          specialty: body.specialty,
          biography: body.biography,
          yearsOfExperience: body.yearsOfExperience,
          languages: body.languages,
          consultationFeeAmount: body.consultationFeeAmount,
          hospitalId: body.hospitalId,
          publications: body.publications,
          awards: body.awards,
          specialtyId: body.specialtyId,
          professionalRank: body.professionalRank,
          licenseExpiryDate: body.licenseExpiryDate ? new Date(body.licenseExpiryDate) : undefined,
          departmentId: body.departmentId,
        }),
      );
      const account = await this.getAccountOrThrow(user.accountId);
      return envelope(DoctorProfileResponseDto.fromDomain(profile, account));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
  // resolves a VerificationCase's own subjectAccountId to its DoctorProfile
  // -- the admin case-detail page's only way to show the fuller professional
  // fields (expiry/rank/department) a VerificationCase doesn't itself
  // denormalize. SuperAdmin-only (unlike the public GET /doctors/:id below):
  // an arbitrary account-id lookup is an administrative capability, not
  // public directory data.
  @Get('by-account/:accountId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.SuperAdmin)
  async getByAccountId(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const profile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId });
      if (!profile) {
        throw new NotFoundError(`Doctor profile for account "${accountId}" not found.`);
      }
      const account = await this.getAccountOrThrow(profile.getAccountId());
      return envelope(DoctorProfileResponseDto.fromDomain(profile, account));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  // Intentionally public: a doctor's professional profile (name, specialty,
  // license, bio, experience) is public directory data, not PHI -- the same
  // shape the future doctor-directory/search feature will surface to
  // prospective patients. No guard needed.
  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const profile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: id });
      if (!profile) {
        throw new NotFoundError(`Doctor profile "${id}" not found.`);
      }
      const account = await this.getAccountOrThrow(profile.getAccountId());
      return envelope(DoctorProfileResponseDto.fromDomain(profile, account));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.Doctor)
  async update(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDoctorProfileRequestDto,
  ): Promise<ResponseEnvelope<DoctorProfileResponseDto>> {
    try {
      const existing = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: id });
      // Same "never leak existence to a non-owner" pattern used by /doctors/me
      // and every other own-resource mutation in this codebase.
      if (!existing || existing.getAccountId() !== user.accountId) {
        throw new NotFoundError(`Doctor profile "${id}" not found.`);
      }
      const profile = await this.updateDoctorProfileUseCase.execute(
        new UpdateDoctorProfileCommand({
          doctorProfileId: id,
          specialty: body.specialty,
          biography: body.biography,
          yearsOfExperience: body.yearsOfExperience,
          languages: body.languages,
          consultationFeeAmount: body.consultationFeeAmount,
          hospitalId: body.hospitalId,
          publications: body.publications,
          awards: body.awards,
          specialtyId: body.specialtyId,
          professionalRank: body.professionalRank,
          licenseExpiryDate: body.licenseExpiryDate ? new Date(body.licenseExpiryDate) : undefined,
          departmentId: body.departmentId,
        }),
      );
      const account = await this.getAccountOrThrow(profile.getAccountId());
      return envelope(DoctorProfileResponseDto.fromDomain(profile, account));
    } catch (error) {
      throw mapDoctorError(error);
    }
  }

  private async myProfileOrThrow(accountId: string): Promise<DoctorProfile> {
    const profile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId });
    if (!profile) {
      throw new NotFoundError(`Doctor profile for account "${accountId}" not found.`);
    }
    return profile;
  }

  private async getAccountOrThrow(accountId: string) {
    const account = await this.getAccountByIdUseCase.execute({ accountId });
    if (!account) {
      // A profile/JWT implies the account existed at issuance -- surfaced as
      // not-found rather than a 500 in case it was since removed.
      throw new NotFoundError(`Account "${accountId}" not found.`);
    }
    return account;
  }
}
