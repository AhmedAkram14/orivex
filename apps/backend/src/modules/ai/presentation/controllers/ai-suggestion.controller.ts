import { Body, Controller, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { RecordDoctorDecisionCommand } from '../../application/use-cases/record-doctor-decision/record-doctor-decision.command.js';
import { RecordDoctorDecisionUseCase } from '../../application/use-cases/record-doctor-decision/record-doctor-decision.use-case.js';
import { RequestAISuggestionCommand } from '../../application/use-cases/request-ai-suggestion/request-ai-suggestion.command.js';
import { RequestAISuggestionUseCase } from '../../application/use-cases/request-ai-suggestion/request-ai-suggestion.use-case.js';
import { AISuggestionResponseDto } from '../dto/ai-suggestion-response.dto.js';
import { RecordDoctorDecisionRequestDto } from '../dto/record-doctor-decision-request.dto.js';
import { RequestAISuggestionRequestDto } from '../dto/request-ai-suggestion-request.dto.js';
import { mapAIError } from '../mappers/ai-exception.mapper.js';

// Matches docs/12-openapi.md's POST /ai/suggestions (requestAISuggestion) and
// PATCH /ai/suggestions/{id} (recordDoctorDecision) exactly.
@Controller('ai/suggestions')
export class AISuggestionController {
  constructor(
    private readonly requestAISuggestionUseCase: RequestAISuggestionUseCase,
    private readonly recordDoctorDecisionUseCase: RecordDoctorDecisionUseCase,
  ) {}

  @Post()
  async request(
    @Body() body: RequestAISuggestionRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseEnvelope<AISuggestionResponseDto | { status: string; warnings: string[] }>> {
    try {
      const result = await this.requestAISuggestionUseCase.execute(
        new RequestAISuggestionCommand({
          consultationSessionId: body.consultationSessionId,
          suggestionType: body.suggestionType,
          requestingDoctorId: body.requestingDoctorId,
        }),
      );

      if (result.kind === 'unavailable') {
        res.status(HttpStatus.ACCEPTED);
        return envelope({ status: 'unavailable', warnings: result.warnings });
      }

      res.status(HttpStatus.OK);
      return envelope(AISuggestionResponseDto.fromDomain(result.suggestion));
    } catch (error) {
      throw mapAIError(error);
    }
  }

  @Patch(':id')
  async recordDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordDoctorDecisionRequestDto,
  ): Promise<ResponseEnvelope<AISuggestionResponseDto>> {
    try {
      const suggestion = await this.recordDoctorDecisionUseCase.execute(
        new RecordDoctorDecisionCommand({
          suggestionId: id,
          decision: body.decision,
          justification: body.justification,
        }),
      );
      return envelope(AISuggestionResponseDto.fromDomain(suggestion));
    } catch (error) {
      throw mapAIError(error);
    }
  }
}
