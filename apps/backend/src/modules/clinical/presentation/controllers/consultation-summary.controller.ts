import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetConsultationSummaryUseCase } from '../../application/use-cases/get-consultation-summary/get-consultation-summary.use-case.js';
import { ConsultationSummaryResponseDto } from '../dto/consultation-summary-response.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Consultation lifecycle completion follow-up (2026-07-26): backs both the
// doctor's wrap-up view and the patient's post-consultation summary screen
// -- same route, same shape, for whichever role actually owns this
// consultation (mirrors ConsultationController's room-token route, the
// existing precedent for a route reachable by either role with per-role
// ownership derivation).
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor, AccountRole.Patient)
export class ConsultationSummaryController {
  constructor(
    private readonly getConsultationSummaryUseCase: GetConsultationSummaryUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  @Get(':id/summary')
  async getSummary(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<ConsultationSummaryResponseDto>> {
    try {
      const result = await this.getConsultationSummaryUseCase.execute({ consultationSessionId: id });

      const isOwner =
        user.role === AccountRole.Doctor
          ? (await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId }))?.getId() ===
            result.appointment.getDoctorId()
          : (await this.getPatientProfileByAccountIdUseCase.execute({ accountId: user.accountId }))?.getId() ===
            result.appointment.getPatientId();

      if (!isOwner) {
        throw new NotFoundError(`ConsultationSession "${id}" not found.`);
      }

      return envelope(ConsultationSummaryResponseDto.fromResult(result));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }
}
