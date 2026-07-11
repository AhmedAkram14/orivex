import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CloseConsultationCommand } from '../../application/use-cases/close-consultation/close-consultation.command.js';
import { CloseConsultationUseCase } from '../../application/use-cases/close-consultation/close-consultation.use-case.js';
import { StartConsultationCommand } from '../../application/use-cases/start-consultation/start-consultation.command.js';
import { StartConsultationUseCase } from '../../application/use-cases/start-consultation/start-consultation.use-case.js';
import { CloseConsultationRequestDto } from '../dto/close-consultation-request.dto.js';
import { ConsultationSessionResponseDto } from '../dto/consultation-session-response.dto.js';
import { mapConsultationError } from '../mappers/consultation-exception.mapper.js';

// Matches docs/12-openapi.md's /consultations/{id}/start and
// /consultations/{id}/close exactly.
@Controller('consultations')
export class ConsultationController {
  constructor(
    private readonly startConsultationUseCase: StartConsultationUseCase,
    private readonly closeConsultationUseCase: CloseConsultationUseCase,
  ) {}

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async start(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseEnvelope<ConsultationSessionResponseDto>> {
    try {
      const session = await this.startConsultationUseCase.execute(
        new StartConsultationCommand({ consultationSessionId: id }),
      );
      return envelope(ConsultationSessionResponseDto.fromDomain(session));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseConsultationRequestDto,
  ): Promise<ResponseEnvelope<ConsultationSessionResponseDto>> {
    try {
      const session = await this.closeConsultationUseCase.execute(
        new CloseConsultationCommand({ consultationSessionId: id, completionReason: body.completionReason }),
      );
      return envelope(ConsultationSessionResponseDto.fromDomain(session));
    } catch (error) {
      throw mapConsultationError(error);
    }
  }
}
