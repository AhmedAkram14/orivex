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
