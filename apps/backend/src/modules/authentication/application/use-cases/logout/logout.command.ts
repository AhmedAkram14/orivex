export interface LogoutCommandProps {
  refreshToken?: string;
}

export class LogoutCommand {
  readonly refreshToken?: string;

  constructor(props: LogoutCommandProps) {
    this.refreshToken = props.refreshToken;
  }
}
