export class ListScheduleExceptionsForDoctorQuery {
  readonly doctorId: string;

  constructor(props: { doctorId: string }) {
    this.doctorId = props.doctorId;
  }
}
