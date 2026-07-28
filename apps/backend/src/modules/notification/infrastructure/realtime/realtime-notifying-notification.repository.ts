import type { RealtimeEmitterPort } from '../../../../platform/realtime/ports/realtime-emitter.port.js';
import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

// Decorates the real repository with a single, central live-push point --
// every notification producer (4+ event handlers, and growing) calls the
// same `save()` this codebase already established, so wrapping it here
// means none of them need their own RealtimeEmitterPort wiring. Covers both
// a genuinely new notification and a read-toggle (Notification.save() is
// the same upsert call site for both -- see PrismaNotificationRepository's
// own comment); the frontend just invalidates its notifications list
// either way, so firing on both is correct, not just convenient.
export class RealtimeNotifyingNotificationRepository implements NotificationRepository {
  constructor(
    private readonly inner: NotificationRepository,
    private readonly realtimeEmitter: RealtimeEmitterPort,
  ) {}

  findById(id: string): Promise<Notification | null> {
    return this.inner.findById(id);
  }

  findByAccountId(accountId: string): Promise<Notification[]> {
    return this.inner.findByAccountId(accountId);
  }

  findByAccountIdPage(accountId: string, skip: number, take: number): Promise<Notification[]> {
    return this.inner.findByAccountIdPage(accountId, skip, take);
  }

  countByAccountId(accountId: string): Promise<number> {
    return this.inner.countByAccountId(accountId);
  }

  async save(notification: Notification): Promise<void> {
    await this.inner.save(notification);
    this.realtimeEmitter.emitToAccount(notification.getAccountId(), 'notification.changed', {
      id: notification.getId(),
    });
  }
}
