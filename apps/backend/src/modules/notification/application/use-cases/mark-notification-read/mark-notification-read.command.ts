export class MarkNotificationReadCommand {
  readonly notificationId: string;
  readonly accountId: string;

  constructor(props: { notificationId: string; accountId: string }) {
    this.notificationId = props.notificationId;
    this.accountId = props.accountId;
  }
}
