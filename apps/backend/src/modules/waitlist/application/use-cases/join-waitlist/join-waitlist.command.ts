import type { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';

export interface JoinWaitlistCommandProps {
  callerAccountId: string;
  doctorId: string;
  consultationType?: ConsultationType;
  earliestAcceptableAt: Date;
  latestAcceptableAt: Date;
}

export class JoinWaitlistCommand {
  readonly callerAccountId: string;
  readonly doctorId: string;
  readonly consultationType?: ConsultationType;
  readonly earliestAcceptableAt: Date;
  readonly latestAcceptableAt: Date;

  constructor(props: JoinWaitlistCommandProps) {
    this.callerAccountId = props.callerAccountId;
    this.doctorId = props.doctorId;
    this.consultationType = props.consultationType;
    this.earliestAcceptableAt = props.earliestAcceptableAt;
    this.latestAcceptableAt = props.latestAcceptableAt;
  }
}
