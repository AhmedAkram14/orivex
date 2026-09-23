import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { TreatingRelationshipService } from '../../../consultation/application/services/treating-relationship.service.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { RecordAuditLogCommand } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';
import { ConfirmNoKnownAllergiesCommand } from '../../application/use-cases/confirm-no-known-allergies/confirm-no-known-allergies.command.js';
import { ConfirmNoKnownAllergiesUseCase } from '../../application/use-cases/confirm-no-known-allergies/confirm-no-known-allergies.use-case.js';
import { PatientProfileResponseDto } from '../dto/patient-profile-response.dto.js';
import { mapPatientError } from '../mappers/patient-exception.mapper.js';

// Doctor Patient Chart plan, 4.3 (decision 2): a deliberate, new doctor-
// write-authority boundary into PatientModule -- separate from
// PatientProfileController (which is patient-self-service only, `/patients/
// me/...`, `@Roles(AccountRole.Patient)` at the class level). This
// controller is the doctor-facing counterpart, scoped to a specific
// `:id` patient profile and authorized via the same shared
// TreatingRelationshipService every other new doctor-write route in this
// plan uses (decision 8) -- never folded into ClinicalModule, since
// `allergies`/`allergiesConfirmedNoneAt` are PatientModule's own fields.
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class DoctorPatientAllergiesController {
  constructor(
    private readonly treatingRelationshipService: TreatingRelationshipService,
    private readonly confirmNoKnownAllergiesUseCase: ConfirmNoKnownAllergiesUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
  ) {}

  @Patch(':id/allergies/confirm-none')
  @HttpCode(HttpStatus.OK)
  async confirmNoKnownAllergies(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) patientId: string,
  ): Promise<ResponseEnvelope<PatientProfileResponseDto>> {
    try {
      const { doctorProfile, profile: existingProfile } = await this.treatingRelationshipService.assertActiveRelationship(
        user.accountId,
        patientId,
      );
      const profile = await this.confirmNoKnownAllergiesUseCase.execute(
        new ConfirmNoKnownAllergiesCommand({
          patientProfileId: existingProfile.getId(),
          confirmedByDoctorId: doctorProfile.getId(),
        }),
      );
      const account = await this.getAccountByIdUseCase.execute({ accountId: profile.getAccountId() });
      if (!account) {
        throw new Error(`Data integrity violation: Account "${profile.getAccountId()}" not found.`);
      }
      // The confirming doctor is the caller themselves -- no extra lookup
      // needed, unlike getProfile()'s cross-time resolution of a possibly
      // different doctor.
      const confirmingAccount = await this.getAccountByIdUseCase.execute({ accountId: user.accountId });
      const allergiesConfirmedByName = confirmingAccount?.getUserProfile().getDisplayName().toString();
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.PatientAllergiesConfirmedNone,
          subjectType: 'patient',
          subjectId: patientId,
        }),
      );
      return envelope(PatientProfileResponseDto.fromDomain(profile, account, undefined, true, allergiesConfirmedByName));
    } catch (error) {
      throw mapPatientError(error);
    }
  }
}
