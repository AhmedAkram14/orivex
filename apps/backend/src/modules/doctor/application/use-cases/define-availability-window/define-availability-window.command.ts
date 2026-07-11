import type { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';

export interface DefineAvailabilityWindowCommandProps {
  doctorId: string;
  startTime: Date;
  endTime: Date;
  consultationType: ConsultationType;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class DefineAvailabilityWindowCommand {
  readonly doctorId: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly consultationType: ConsultationType;

  constructor(props: DefineAvailabilityWindowCommandProps) {
    this.doctorId = props.doctorId;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.consultationType = props.consultationType;
  }
}
