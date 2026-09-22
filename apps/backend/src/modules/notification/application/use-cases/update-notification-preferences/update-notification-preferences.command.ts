export interface UpdateNotificationPreferencesCommandProps {
  accountId: string;
  emailAppointments?: boolean;
  emailBilling?: boolean;
  inAppAppointments?: boolean;
  inAppBilling?: boolean;
  emailNewDeviceLogin?: boolean;
}

// Commands are application messages, not structural types -- immutable by
// construction (matches every other module's established Command style,
// e.g. UpdatePersonalProfileCommand). Every channel field is optional --
// PATCH semantics: only fields the caller actually sent get applied, never
// clobbering the others (Doctor Settings Rebuild, Phase 2).
export class UpdateNotificationPreferencesCommand {
  readonly accountId: string;
  readonly emailAppointments?: boolean;
  readonly emailBilling?: boolean;
  readonly inAppAppointments?: boolean;
  readonly inAppBilling?: boolean;
  readonly emailNewDeviceLogin?: boolean;

  constructor(props: UpdateNotificationPreferencesCommandProps) {
    this.accountId = props.accountId;
    this.emailAppointments = props.emailAppointments;
    this.emailBilling = props.emailBilling;
    this.inAppAppointments = props.inAppAppointments;
    this.inAppBilling = props.inAppBilling;
    this.emailNewDeviceLogin = props.emailNewDeviceLogin;
  }
}
