export class RemoveScheduleExceptionCommand {
  readonly exceptionId: string;
  readonly doctorId: string;

  constructor(props: { exceptionId: string; doctorId: string }) {
    this.exceptionId = props.exceptionId;
    this.doctorId = props.doctorId;
  }
}
