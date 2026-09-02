import type { VitalType } from '../../../domain/enums/vital-type.enum.js';

export interface RecordVitalReadingProps {
  consultationSessionId: string;
  authoringDoctorAccountId: string;
  type: VitalType;
  value: number;
  diastolicValue?: number;
  recordedAt?: Date;
}

export class RecordVitalReadingCommand {
  readonly consultationSessionId: string;
  readonly authoringDoctorAccountId: string;
  readonly type: VitalType;
  readonly value: number;
  readonly diastolicValue?: number;
  readonly recordedAt?: Date;

  constructor(props: RecordVitalReadingProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.authoringDoctorAccountId = props.authoringDoctorAccountId;
    this.type = props.type;
    this.value = props.value;
    this.diastolicValue = props.diastolicValue;
    this.recordedAt = props.recordedAt;
  }
}
