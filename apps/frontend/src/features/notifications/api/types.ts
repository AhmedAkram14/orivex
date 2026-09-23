export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationEntry {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  createdAt: string;
  read: boolean;
  /** Same-origin, locale-agnostic app path to navigate to on click -- undefined when there's no single relevant page. */
  actionUrl?: string;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
}

/**
 * `notificationsApi.list()`'s real return shape (Notification Center
 * pagination fix) -- the backend's `NotificationController` puts
 * page/limit/total on the envelope's `meta`, not `data` (unlike e.g. admin's
 * payments list, which bundles them into `data` itself), so the API layer
 * folds them back together into one object here for callers, mirroring
 * `ListAdminPaymentTransactionsResult`'s shape.
 */
export interface ListNotificationsResult {
  notifications: NotificationEntry[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Mirrors the backend's `NotificationPreferencesResponseDto` exactly (Doctor
 * Settings Rebuild, Phase 4) -- the 4 real category x channel toggles this
 * module supports (Appointments/Billing x Email/In-app). No Messages
 * fields, no SMS/push (see the backend's own `NotificationCategory`/
 * `NotificationChannel` enum comments for why).
 */
export interface NotificationPreferences {
  emailAppointments: boolean;
  emailBilling: boolean;
  inAppAppointments: boolean;
  inAppBilling: boolean;
  /** Security Center rework -- "email me when my account signs in from a new device". A standalone flag, not part of the Appointments/Billing category grid above. */
  emailNewDeviceLogin: boolean;
}

/** PATCH semantics -- only the toggles the caller actually flips get sent. */
export type UpdateNotificationPreferencesRequest = Partial<NotificationPreferences>;
