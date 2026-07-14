export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationEntry {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  createdAt: string;
  read: boolean;
}

export type ListNotificationsResponse = NotificationEntry[];
