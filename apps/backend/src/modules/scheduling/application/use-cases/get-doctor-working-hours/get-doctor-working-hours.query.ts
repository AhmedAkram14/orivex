export class GetDoctorWorkingHoursQuery {
  readonly doctorId: string;

  constructor(props: { doctorId: string }) {
    this.doctorId = props.doctorId;
  }
}
