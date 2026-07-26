export class ListAvailabilityWindowsForDoctorQuery {
  readonly doctorId: string;
  readonly from: Date;
  readonly to: Date;

  constructor(props: { doctorId: string; from: Date; to: Date }) {
    this.doctorId = props.doctorId;
    this.from = props.from;
    this.to = props.to;
  }
}
