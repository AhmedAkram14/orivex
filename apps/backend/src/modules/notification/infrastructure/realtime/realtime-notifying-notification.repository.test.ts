import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { RealtimeNotifyingNotificationRepository } from './realtime-notifying-notification.repository.js';

class FakeInnerRepository implements NotificationRepository {
  public saved: Notification[] = [];
  async findById(): Promise<Notification | null> {
    return null;
  }
  async findByAccountId(): Promise<Notification[]> {
    return [];
  }
  async findByAccountIdPage(): Promise<Notification[]> {
    return [];
  }
  async countByAccountId(): Promise<number> {
    return 0;
  }
  async save(notification: Notification): Promise<void> {
    this.saved.push(notification);
  }
}

class FakeRealtimeEmitter {
  public emitted: { accountId: string; event: string; payload: unknown }[] = [];
  emitToAccount(accountId: string, event: string, payload: unknown): void {
    this.emitted.push({ accountId, event, payload });
  }
}

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('RealtimeNotifyingNotificationRepository', () => {
  it('saves through to the inner repository and emits a live event to the notification\'s own account', async () => {
    const inner = new FakeInnerRepository();
    const emitter = new FakeRealtimeEmitter();
    const repo = new RealtimeNotifyingNotificationRepository(inner, emitter);
    const notification = Notification.create({ accountId: ACCOUNT_ID, title: 'Test', description: 'Test description' });

    await repo.save(notification);

    assert.equal(inner.saved.length, 1);
    assert.equal(inner.saved[0], notification);
    assert.equal(emitter.emitted.length, 1);
    assert.equal(emitter.emitted[0].accountId, ACCOUNT_ID);
    assert.equal(emitter.emitted[0].event, 'notification.changed');
  });

  it('also emits on a read-toggle save, not just first creation', async () => {
    const inner = new FakeInnerRepository();
    const emitter = new FakeRealtimeEmitter();
    const repo = new RealtimeNotifyingNotificationRepository(inner, emitter);
    const notification = Notification.create({ accountId: ACCOUNT_ID, title: 'Test', description: 'Test description' });
    notification.markRead();

    await repo.save(notification);

    assert.equal(emitter.emitted.length, 1);
  });

  it('delegates every read method straight to the inner repository', async () => {
    const inner = new FakeInnerRepository();
    const emitter = new FakeRealtimeEmitter();
    const repo = new RealtimeNotifyingNotificationRepository(inner, emitter);

    await repo.findById('x');
    await repo.findByAccountId(ACCOUNT_ID);
    await repo.findByAccountIdPage(ACCOUNT_ID, 0, 10);
    await repo.countByAccountId(ACCOUNT_ID);

    assert.equal(emitter.emitted.length, 0);
  });
});
