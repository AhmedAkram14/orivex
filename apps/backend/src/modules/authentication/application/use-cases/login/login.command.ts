export interface LoginCommandProps {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export class LoginCommand {
  readonly email: string;
  readonly password: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;

  constructor(props: LoginCommandProps) {
    this.email = props.email;
    this.password = props.password;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
  }
}
