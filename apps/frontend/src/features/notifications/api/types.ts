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

export type ListNotificationsResponse = NotificationEntry[];
