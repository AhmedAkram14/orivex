export interface RegisterCommandProps {
  fullName: string;
  email: string;
  password: string;
}

export class RegisterCommand {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;

  constructor(props: RegisterCommandProps) {
    this.fullName = props.fullName;
    this.email = props.email;
    this.password = props.password;
  }
}
