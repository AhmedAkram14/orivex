import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { RecordClinicalNoteCommand } from '../../application/use-cases/record-clinical-note/record-clinical-note.command.js';
import { RecordClinicalNoteUseCase } from '../../application/use-cases/record-clinical-note/record-clinical-note.use-case.js';
import { ClinicalNoteResponseDto } from '../dto/clinical-note-response.dto.js';
import { RecordClinicalNoteRequestDto } from '../dto/record-clinical-note-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Matches docs/12-openapi.md's POST /consultations/{id}/notes
// (createClinicalNote, "treating doctor only") exactly. Gated to
// AccountRole.Doctor; the use case itself separately enforces that the
// resolved doctor is this consultation's treating doctor.
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Doctor)
export class ClinicalNoteController {
  constructor(
    private readonly recordClinicalNoteUseCase: RecordClinicalNoteUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  async recordNote(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordClinicalNoteRequestDto,
  ): Promise<ResponseEnvelope<ClinicalNoteResponseDto>> {
    try {
      const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: user.accountId });
      if (!doctorProfile) {
        throw new NotFoundError('No doctor profile exists for this account.');
      }
      const note = await this.recordClinicalNoteUseCase.execute(
        new RecordClinicalNoteCommand({
          consultationSessionId: id,
          authoringDoctorId: doctorProfile.getId(),
          content: body.content,
          addendumOfNoteId: body.addendumOfNoteId,
        }),
      );
      return envelope(ClinicalNoteResponseDto.fromDomain(note));
    } catch (error) {
      throw mapClinicalError(error);
    }
  }
}
