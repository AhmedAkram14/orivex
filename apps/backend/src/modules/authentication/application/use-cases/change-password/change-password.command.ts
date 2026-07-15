export interface ChangePasswordCommandProps {
  accountId: string;
  currentPassword: string;
  newPassword: string;
  currentRefreshToken?: string;
}

export class ChangePasswordCommand {
  readonly accountId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly currentRefreshToken?: string;

  constructor(props: ChangePasswordCommandProps) {
    this.accountId = props.accountId;
    this.currentPassword = props.currentPassword;
    this.newPassword = props.newPassword;
    this.currentRefreshToken = props.currentRefreshToken;
  }
}
