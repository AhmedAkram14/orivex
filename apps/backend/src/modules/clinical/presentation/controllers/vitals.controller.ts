import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { RecordAuditLogCommand } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.command.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { AuditAction } from '../../../trust/domain/enums/audit-action.enum.js';
import { RecordVitalReadingCommand } from '../../application/use-cases/record-vital-reading/record-vital-reading.command.js';
import { RecordVitalReadingUseCase } from '../../application/use-cases/record-vital-reading/record-vital-reading.use-case.js';
import { VitalReadingResponseDto } from '../dto/health-vital-summary-response.dto.js';
import { RecordVitalReadingRequestDto } from '../dto/record-vital-reading-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Real Clinical Vitals Demo pass: the write side of the Patient Health
// Dashboard (GET /patients/me/health-dashboard already existed, real, just
// permanently empty for lack of a producer). Doctor-only, treating-doctor-
// only (enforced in RecordVitalReadingUseCase), mirroring DiagnosisController
// / ClinicalNoteController's exact shape.
//
// Audit trail gap fix (ORIVEX Remaining Work Audit, P0 C2): recorded only
// after the reading is actually saved.
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class VitalsController {
  constructor(
    private readonly recordVitalReadingUseCase: RecordVitalReadingUseCase,
    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
  ) {}

  @Post(':id/vitals')
  @HttpCode(HttpStatus.CREATED)
  async recordVital(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordVitalReadingRequestDto,
  ): Promise<ResponseEnvelope<VitalReadingResponseDto>> {
    try {
      const result = await this.recordVitalReadingUseCase.execute(
        new RecordVitalReadingCommand({
          consultationSessionId: id,
          authoringDoctorAccountId: user.accountId,
          type: body.type,
          value: body.value,
          diastolicValue: body.diastolicValue,
        }),
      );
      await this.recordAuditLogUseCase.execute(
        new RecordAuditLogCommand({
          actorAccountId: user.accountId,
          actorRole: user.role,
          action: AuditAction.VitalReadingRecorded,
          subjectType: 'consultation_session',
          subjectId: id,
          metadata: { vitalReadingId: result.getId(), type: body.type },
        }),
      );
      return envelope(VitalReadingResponseDto.fromDomain(result));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }
}
