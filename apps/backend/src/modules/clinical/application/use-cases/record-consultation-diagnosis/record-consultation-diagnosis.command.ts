import type { CertaintyLevel } from '../../../domain/enums/certainty-level.enum.js';

export interface RecordConsultationDiagnosisProps {
  consultationSessionId: string;
  authoringDoctorAccountId: string;
  freeTextDescription: string;
  certaintyLevel?: CertaintyLevel;
  startJourney?: boolean;
}

export class RecordConsultationDiagnosisCommand {
  readonly consultationSessionId: string;
  readonly authoringDoctorAccountId: string;
  readonly freeTextDescription: string;
  readonly certaintyLevel?: CertaintyLevel;
  readonly startJourney?: boolean;

  constructor(props: RecordConsultationDiagnosisProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.authoringDoctorAccountId = props.authoringDoctorAccountId;
    this.freeTextDescription = props.freeTextDescription;
    this.certaintyLevel = props.certaintyLevel;
    this.startJourney = props.startJourney;
  }
}
