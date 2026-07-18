import type { Notification } from '../entities/notification.entity.js';

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  // Ordered by createdAt descending (most recent first). Unbounded --
  // only used where every notification is genuinely needed (marking all as
  // read); the paginated GET /notifications list uses
  // findByAccountIdPage/countByAccountId below instead (Production
  // Readiness Audit -- "introduce pagination where required").
  findByAccountId(accountId: string): Promise<Notification[]>;
  findByAccountIdPage(accountId: string, skip: number, take: number): Promise<Notification[]>;
  countByAccountId(accountId: string): Promise<number>;
  save(notification: Notification): Promise<void>;
}
