export interface RefreshSessionCommandProps {
  refreshToken: string;
}

export class RefreshSessionCommand {
  readonly refreshToken: string;

  constructor(props: RefreshSessionCommandProps) {
    this.refreshToken = props.refreshToken;
  }
}
