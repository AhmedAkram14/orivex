export interface UnfollowDoctorProps {
  callerAccountId: string;
  doctorId: string;
}

export class UnfollowDoctorCommand {
  readonly callerAccountId: string;
  readonly doctorId: string;

  constructor(props: UnfollowDoctorProps) {
    this.callerAccountId = props.callerAccountId;
    this.doctorId = props.doctorId;
  }
}
