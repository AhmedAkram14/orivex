export interface CreateHospitalCommandProps {
  name: string;
  address?: string;
}

export class CreateHospitalCommand {
  readonly name: string;
  readonly address?: string;

  constructor(props: CreateHospitalCommandProps) {
    this.name = props.name;
    this.address = props.address;
  }
}
