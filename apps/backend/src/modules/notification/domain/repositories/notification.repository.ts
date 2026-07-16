import type { Notification } from '../entities/notification.entity.js';

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  // Ordered by createdAt descending (most recent first).
  findByAccountId(accountId: string): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
}
