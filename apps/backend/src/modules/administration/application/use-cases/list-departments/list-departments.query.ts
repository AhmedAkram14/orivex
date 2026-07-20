export interface ListDepartmentsQueryProps {
  hospitalId: string;
}

export class ListDepartmentsQuery {
  readonly hospitalId: string;

  constructor(props: ListDepartmentsQueryProps) {
    this.hospitalId = props.hospitalId;
  }
}
