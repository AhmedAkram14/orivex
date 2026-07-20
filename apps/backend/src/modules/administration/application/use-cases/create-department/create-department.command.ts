export interface CreateDepartmentCommandProps {
  hospitalId: string;
  name: string;
}

export class CreateDepartmentCommand {
  readonly hospitalId: string;
  readonly name: string;

  constructor(props: CreateDepartmentCommandProps) {
    this.hospitalId = props.hospitalId;
    this.name = props.name;
  }
}
