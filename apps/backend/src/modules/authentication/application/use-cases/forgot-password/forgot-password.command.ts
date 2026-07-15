export interface ForgotPasswordCommandProps {
  email: string;
}

export class ForgotPasswordCommand {
  readonly email: string;

  constructor(props: ForgotPasswordCommandProps) {
    this.email = props.email;
  }
}
