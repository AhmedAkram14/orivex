import type { CertaintyLevel } from '../../../domain/enums/certainty-level.enum.js';
import type { HealthGraphNodeType } from '../../../domain/enums/health-graph-node-type.enum.js';

export interface RecordDiagnosisCommandProps {
  patientId: string;
  doctorId: string;
  consultationSessionId?: string;
  nodeType: HealthGraphNodeType;
  freeTextDescription?: string;
  certaintyLevel?: CertaintyLevel;
  startJourney?: boolean;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class RecordDiagnosisCommand {
  readonly patientId: string;
  readonly doctorId: string;
  readonly consultationSessionId?: string;
  readonly nodeType: HealthGraphNodeType;
  readonly freeTextDescription?: string;
  readonly certaintyLevel?: CertaintyLevel;
  readonly startJourney?: boolean;

  constructor(props: RecordDiagnosisCommandProps) {
    this.patientId = props.patientId;
    this.doctorId = props.doctorId;
    this.consultationSessionId = props.consultationSessionId;
    this.nodeType = props.nodeType;
    this.freeTextDescription = props.freeTextDescription;
    this.certaintyLevel = props.certaintyLevel;
    this.startJourney = props.startJourney;
  }
}
