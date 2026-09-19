import { randomUUID } from 'node:crypto';

import { NotificationDomainError } from '../exceptions/notification-domain.error.js';
import { NotificationCategory } from '../enums/notification-category.enum.js';
import { NotificationChannel } from '../enums/notification-channel.enum.js';

export interface CreateNotificationPreferenceProps {
  accountId: string;
}

export interface ReconstituteNotificationPreferenceProps {
  id: string;
  accountId: string;
  emailAppointments: boolean;
  emailBilling: boolean;
  inAppAppointments: boolean;
  inAppBilling: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// NotificationModule's own aggregate root for a single account's per-
// category x per-channel delivery toggles (Doctor Settings Rebuild, Phase 0
// -- domain only, no persistence/use-cases/fan-out wiring yet; that's
// Phases 2-3). One row per account, created lazily on first write -- no row
// existing means "everything on" (GetNotificationPreferencesUseCase, Phase
// 2, returns an in-memory all-true default instead of persisting one).
// SMS/push are deliberately excluded -- no provider exists for either.
export class NotificationPreference {
  private constructor(
    private readonly id: string,
    private readonly accountId: string,
    private emailAppointments: boolean,
    private emailBilling: boolean,
    private inAppAppointments: boolean,
    private inAppBilling: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: CreateNotificationPreferenceProps): NotificationPreference {
    if (!props.accountId || props.accountId.trim().length === 0) {
      throw new NotificationDomainError('accountId must not be empty.');
    }

    const now = new Date();
    return new NotificationPreference(randomUUID(), props.accountId, true, true, true, true, now, now);
  }

  static reconstitute(props: ReconstituteNotificationPreferenceProps): NotificationPreference {
    return new NotificationPreference(
      props.id,
      props.accountId,
      props.emailAppointments,
      props.emailBilling,
      props.inAppAppointments,
      props.inAppBilling,
      props.createdAt,
      props.updatedAt,
    );
  }

  updateChannel(category: NotificationCategory, channel: NotificationChannel, enabled: boolean): void {
    if (category === NotificationCategory.Appointments && channel === NotificationChannel.Email) {
      this.emailAppointments = enabled;
    } else if (category === NotificationCategory.Billing && channel === NotificationChannel.Email) {
      this.emailBilling = enabled;
    } else if (category === NotificationCategory.Appointments && channel === NotificationChannel.InApp) {
      this.inAppAppointments = enabled;
    } else if (category === NotificationCategory.Billing && channel === NotificationChannel.InApp) {
      this.inAppBilling = enabled;
    } else {
      throw new NotificationDomainError(`Unsupported category/channel combination: ${category}/${channel}.`);
    }

    this.updatedAt = new Date();
  }

  isChannelEnabled(category: NotificationCategory, channel: NotificationChannel): boolean {
    if (category === NotificationCategory.Appointments && channel === NotificationChannel.Email) {
      return this.emailAppointments;
    }
    if (category === NotificationCategory.Billing && channel === NotificationChannel.Email) {
      return this.emailBilling;
    }
    if (category === NotificationCategory.Appointments && channel === NotificationChannel.InApp) {
      return this.inAppAppointments;
    }
    if (category === NotificationCategory.Billing && channel === NotificationChannel.InApp) {
      return this.inAppBilling;
    }
    throw new NotificationDomainError(`Unsupported category/channel combination: ${category}/${channel}.`);
  }

  getId(): string {
    return this.id;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getEmailAppointments(): boolean {
    return this.emailAppointments;
  }

  getEmailBilling(): boolean {
    return this.emailBilling;
  }

  getInAppAppointments(): boolean {
    return this.inAppAppointments;
  }

  getInAppBilling(): boolean {
    return this.inAppBilling;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
