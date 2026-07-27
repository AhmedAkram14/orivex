import type { RecordDiagnosisResult } from '../../application/use-cases/record-diagnosis/record-diagnosis.use-case.js';

import { HealthGraphNodeResponseDto } from './health-graph-node-response.dto.js';
import { HealthJourneyResponseDto } from './health-journey-response.dto.js';

export class RecordDiagnosisResponseDto {
  node!: HealthGraphNodeResponseDto;
  journey?: HealthJourneyResponseDto;

  static fromResult(result: RecordDiagnosisResult): RecordDiagnosisResponseDto {
    const dto = new RecordDiagnosisResponseDto();
    dto.node = HealthGraphNodeResponseDto.fromDomain(result.node);
    dto.journey = result.journey ? HealthJourneyResponseDto.fromDomain(result.journey, result.node) : undefined;
    return dto;
  }
}
