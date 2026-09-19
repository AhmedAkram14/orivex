import type { NotificationPreference } from '../../domain/entities/notification-preference.entity.js';

// Matches the frontend's notification-preferences hook contract (Doctor
// Settings Rebuild, Phase 4) -- the 4 real category x channel toggles this
// module actually supports (Appointments/Billing x Email/In-app); no
// Messages fields, no SMS/push (see NotificationCategory/NotificationChannel
// enums' own comments for why).
export class NotificationPreferencesResponseDto {
  emailAppointments!: boolean;
  emailBilling!: boolean;
  inAppAppointments!: boolean;
  inAppBilling!: boolean;

  static fromDomain(preference: NotificationPreference): NotificationPreferencesResponseDto {
    const dto = new NotificationPreferencesResponseDto();
    dto.emailAppointments = preference.getEmailAppointments();
    dto.emailBilling = preference.getEmailBilling();
    dto.inAppAppointments = preference.getInAppAppointments();
    dto.inAppBilling = preference.getInAppBilling();
    return dto;
  }
}
