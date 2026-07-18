export class ResendVerificationCommand {
  readonly email: string;

  constructor(props: { email: string }) {
    this.email = props.email;
  }
}
