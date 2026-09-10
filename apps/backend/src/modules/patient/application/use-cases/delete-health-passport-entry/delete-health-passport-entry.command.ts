export interface DeleteHealthPassportEntryCommandProps {
  entryId: string;
  patientId: string;
}

export class DeleteHealthPassportEntryCommand {
  readonly entryId: string;
  readonly patientId: string;

  constructor(props: DeleteHealthPassportEntryCommandProps) {
    this.entryId = props.entryId;
    this.patientId = props.patientId;
  }
}
