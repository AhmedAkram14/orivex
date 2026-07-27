import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { RecordConsultationDiagnosisCommand } from '../../application/use-cases/record-consultation-diagnosis/record-consultation-diagnosis.command.js';
import { RecordConsultationDiagnosisUseCase } from '../../application/use-cases/record-consultation-diagnosis/record-consultation-diagnosis.use-case.js';
import { RecordDiagnosisRequestDto } from '../dto/record-diagnosis-request.dto.js';
import { RecordDiagnosisResponseDto } from '../dto/record-diagnosis-response.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Consultation lifecycle completion follow-up (2026-07-26): the previously
// missing HTTP surface for RecordDiagnosisUseCase (real since Sprint 10,
// never reachable via any route). Doctor-only, treating-doctor-only
// (enforced in RecordConsultationDiagnosisUseCase, mirroring
// ClinicalNoteController's exact shape).
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class DiagnosisController {
  constructor(private readonly recordConsultationDiagnosisUseCase: RecordConsultationDiagnosisUseCase) {}

  @Post(':id/diagnosis')
  @HttpCode(HttpStatus.CREATED)
  async recordDiagnosis(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordDiagnosisRequestDto,
  ): Promise<ResponseEnvelope<RecordDiagnosisResponseDto>> {
    try {
      const result = await this.recordConsultationDiagnosisUseCase.execute(
        new RecordConsultationDiagnosisCommand({
          consultationSessionId: id,
          authoringDoctorAccountId: user.accountId,
          freeTextDescription: body.freeTextDescription,
          certaintyLevel: body.certaintyLevel,
          startJourney: body.startJourney,
        }),
      );
      return envelope(RecordDiagnosisResponseDto.fromResult(result));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }
}
