import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { NotFoundError, ValidationError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { ListAppointmentsForPatientUseCase } from '../../../consultation/application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { ListConsentScopeCategoriesUseCase } from '../../../reference/application/use-cases/list-consent-scope-categories/list-consent-scope-categories.use-case.js';
import { ListMedicalSpecialtiesUseCase } from '../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { GENERAL_CONSENT_SCOPE_CODE } from '../../domain/constants/consent-scope-codes.js';
import { ConsentState } from '../../domain/enums/consent-state.enum.js';
import { GrantConsentCommand } from '../../application/use-cases/grant-consent/grant-consent.command.js';
import { GrantConsentUseCase } from '../../application/use-cases/grant-consent/grant-consent.use-case.js';
import { ListConsentHistoryForPatientUseCase } from '../../application/use-cases/list-consent-history-for-patient/list-consent-history-for-patient.use-case.js';
import { ListRevokedDoctorsForPatientUseCase } from '../../application/use-cases/list-revoked-doctors-for-patient/list-revoked-doctors-for-patient.use-case.js';
import { RevokeConsentCommand } from '../../application/use-cases/revoke-consent/revoke-consent.command.js';
import { RevokeConsentUseCase } from '../../application/use-cases/revoke-consent/revoke-consent.use-case.js';
import { ConsentRecordResponseDto } from '../dto/consent-record-response.dto.js';
import { GrantOrRevokeConsentRequestDto } from '../dto/grant-or-revoke-consent-request.dto.js';
import { SharedDoctorResponseDto } from '../dto/shared-doctor-response.dto.js';

// Consent gap fix (ORIVEX Remaining Work Audit, P0 C3). Matches
// docs/12-openapi.md's POST/GET /patients/{id}/consents exactly -- patient-
// only, and only ever for the caller's own patientId (:id must match their
// own profile, same ownership-safe pattern HealthGraphController's patient
// branch already uses; a doctor has no route here at all, matching "patient-
// initiated only").
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient)
export class ConsentController {
  constructor(
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly grantConsentUseCase: GrantConsentUseCase,
    private readonly revokeConsentUseCase: RevokeConsentUseCase,
    private readonly listConsentHistoryForPatientUseCase: ListConsentHistoryForPatientUseCase,
    private readonly listRevokedDoctorsForPatientUseCase: ListRevokedDoctorsForPatientUseCase,
    private readonly listConsentScopeCategoriesUseCase: ListConsentScopeCategoriesUseCase,
    private readonly listAppointmentsForPatientUseCase: ListAppointmentsForPatientUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly listMedicalSpecialtiesUseCase: ListMedicalSpecialtiesUseCase,
  ) {}

  @Post(':id/consents')
  @HttpCode(HttpStatus.CREATED)
  async manageConsent(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GrantOrRevokeConsentRequestDto,
  ): Promise<ResponseEnvelope<ConsentRecordResponseDto>> {
    const patientId = await this.requireOwnPatientId(user, id);

    if (!body.doctorId) {
      // Platform-wide (doctorId: null) consent is a real, documented shape
      // (docs/09-physical-database.md) but has no product surface yet --
      // see ConsentRecord's own schema comment. Rejected explicitly rather
      // than silently misbehaving.
      throw new ValidationError('doctorId is required -- platform-wide consent scopes are not supported yet.');
    }

    const command = { patientId, doctorId: body.doctorId, scopeCode: body.scopeCategory, legalBasisVersion: body.legalBasisVersion };
    const record =
      body.action === 'grant'
        ? await this.grantConsentUseCase.execute(new GrantConsentCommand(command))
        : await this.revokeConsentUseCase.execute(new RevokeConsentCommand(command));

    return envelope(ConsentRecordResponseDto.fromDomain(record, body.scopeCategory));
  }

  @Get(':id/consents')
  async listConsentHistory(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<ConsentRecordResponseDto[]>> {
    const patientId = await this.requireOwnPatientId(user, id);

    const [history, categories] = await Promise.all([
      this.listConsentHistoryForPatientUseCase.execute({ patientId }),
      this.listConsentScopeCategoriesUseCase.execute(),
    ]);
    const codeById = new Map(categories.map((category) => [category.getId(), category.getCode()]));

    return envelope(
      history.map((record) => ConsentRecordResponseDto.fromDomain(record, codeById.get(record.getScopeCategoryId()) ?? '')),
    );
  }

  // Additive UI-composition view (not part of docs/12-openapi.md's
  // documented Consent paths): every doctor this patient has a real
  // appointment relationship with, plus that doctor's CURRENT consent
  // state (defaulting to Granted per ConsentRecord's own "no row means
  // granted" rule) -- what the patient-facing "Data sharing" screen
  // actually renders. GET /patients/{id}/consents above remains the
  // documented, versioned audit trail; this is a read-model over it.
  @Get('me/data-sharing')
  async listSharedDoctors(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<SharedDoctorResponseDto[]>> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile) {
      return envelope([]);
    }

    const appointments = await this.listAppointmentsForPatientUseCase.execute({ patientId: patientProfile.getId() });
    const doctorIds = [...new Set(appointments.map((appointment) => appointment.getDoctorId()))];

    const [revokedDoctorIds, specialties] = await Promise.all([
      this.listRevokedDoctorsForPatientUseCase.execute({
        patientId: patientProfile.getId(),
        scopeCode: GENERAL_CONSENT_SCOPE_CODE,
      }),
      this.listMedicalSpecialtiesUseCase.execute(),
    ]);
    const specialtyNames = new Map(specialties.map((specialty) => [specialty.getId(), { name: specialty.getName(), nameAr: specialty.getNameAr() ?? null }]));

    const rows = await Promise.all(
      doctorIds.map(async (doctorId) => {
        const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: doctorId });
        if (!doctorProfile) {
          return null;
        }
        const account = await this.getAccountByIdUseCase.execute({ accountId: doctorProfile.getAccountId() });
        if (!account) {
          return null;
        }
        const specialty = specialtyNames.get(doctorProfile.getSpecialtyId());
        return SharedDoctorResponseDto.create({
          doctorId,
          doctorName: account.getUserProfile().getDisplayName().toString(),
          specialization: specialty?.name ?? 'Unknown specialty',
          specializationAr: specialty?.nameAr ?? null,
          consentState: revokedDoctorIds.has(doctorId) ? ConsentState.Revoked : ConsentState.Granted,
        });
      }),
    );

    return envelope(rows.filter((row): row is SharedDoctorResponseDto => row !== null));
  }

  private async requireOwnPatientId(user: AccessTokenClaims, id: string): Promise<string> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId });
    if (!patientProfile || patientProfile.getId() !== id) {
      throw new NotFoundError(`Patient "${id}" not found.`);
    }
    return patientProfile.getId();
  }
}
