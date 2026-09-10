export interface FollowDoctorProps {
  callerAccountId: string;
  doctorId: string;
}

export class FollowDoctorCommand {
  readonly callerAccountId: string;
  readonly doctorId: string;

  constructor(props: FollowDoctorProps) {
    this.callerAccountId = props.callerAccountId;
    this.doctorId = props.doctorId;
  }
}
