import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { RecordClinicalNoteCommand } from '../../application/use-cases/record-clinical-note/record-clinical-note.command.js';
import { RecordClinicalNoteUseCase } from '../../application/use-cases/record-clinical-note/record-clinical-note.use-case.js';
import { ClinicalNoteResponseDto } from '../dto/clinical-note-response.dto.js';
import { RecordClinicalNoteRequestDto } from '../dto/record-clinical-note-request.dto.js';
import { mapClinicalError } from '../mappers/clinical-exception.mapper.js';

// Matches docs/12-openapi.md's POST /consultations/{id}/notes
// (createClinicalNote) exactly.
@Controller('consultations')
export class ClinicalNoteController {
  constructor(private readonly recordClinicalNoteUseCase: RecordClinicalNoteUseCase) {}

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  async recordNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordClinicalNoteRequestDto,
  ): Promise<ResponseEnvelope<ClinicalNoteResponseDto>> {
    try {
      const note = await this.recordClinicalNoteUseCase.execute(
        new RecordClinicalNoteCommand({
          consultationSessionId: id,
          authoringDoctorId: body.authoringDoctorId,
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
