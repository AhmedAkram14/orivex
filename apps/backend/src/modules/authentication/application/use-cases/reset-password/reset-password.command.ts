export interface ResetPasswordCommandProps {
  token: string;
  password: string;
}

export class ResetPasswordCommand {
  readonly token: string;
  readonly password: string;

  constructor(props: ResetPasswordCommandProps) {
    this.token = props.token;
    this.password = props.password;
  }
}
