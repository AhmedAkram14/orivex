export interface VerifyEmailCommandProps {
  token: string;
}

export class VerifyEmailCommand {
  readonly token: string;

  constructor(props: VerifyEmailCommandProps) {
    this.token = props.token;
  }
}
