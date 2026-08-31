import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Job, JobsOptions } from 'bullmq';

import type { EnqueueAppointmentReminderJob } from '../../application/ports/notification-queue.port.js';

import { BullMqNotificationQueueAdapter, type QueueLike } from './bullmq-notification-queue.adapter.js';

class FakeRedisClient {
  constructor(private readonly shouldFail = false) {}
  async info(): Promise<string> {
    if (this.shouldFail) {
      throw new Error('connect ECONNREFUSED');
    }
    return '# Server\r\nredis_version:7.0.0\r\n';
  }
}

class FakeQueue implements QueueLike {
  public lastJobName: string | undefined;
  public lastData: EnqueueAppointmentReminderJob | undefined;
  public lastOptions: JobsOptions | undefined;
  public closeCallCount = 0;
  public readonly client: QueueLike['client'];

  constructor(redisReachable = true) {
    this.client = Promise.resolve(new FakeRedisClient(!redisReachable)) as unknown as QueueLike['client'];
  }

  async add(
    name: string,
    data: EnqueueAppointmentReminderJob,
    opts?: JobsOptions,
  ): Promise<Job<EnqueueAppointmentReminderJob, unknown, string>> {
    this.lastJobName = name;
    this.lastData = data;
    this.lastOptions = opts;
    return { id: 'job-1' } as Job<EnqueueAppointmentReminderJob, unknown, string>;
  }

  async close(): Promise<void> {
    this.closeCallCount += 1;
  }
}

describe('BullMqNotificationQueueAdapter', () => {
  it('enqueues the job under the appointment-reminder name with the given payload and delay', async () => {
    const queue = new FakeQueue();
    const adapter = new BullMqNotificationQueueAdapter(queue);

    await adapter.enqueueAppointmentReminder({
      accountId: '11111111-1111-4111-8111-111111111111',
      appointmentId: '22222222-2222-4222-8222-222222222222',
      scheduledAt: '2026-08-01T10:00:00.000Z',
      delayMs: 60_000,
    });

    assert.equal(queue.lastJobName, 'appointment-reminder');
    assert.deepEqual(queue.lastData, {
      accountId: '11111111-1111-4111-8111-111111111111',
      appointmentId: '22222222-2222-4222-8222-222222222222',
      scheduledAt: '2026-08-01T10:00:00.000Z',
      delayMs: 60_000,
    });
    assert.equal(queue.lastOptions?.delay, 60_000);
    assert.equal(queue.lastOptions?.jobId, 'appointment-reminder-22222222-2222-4222-8222-222222222222');
    assert.equal(queue.lastOptions?.attempts, 3);
    assert.deepEqual(queue.lastOptions?.backoff, { type: 'exponential', delay: 60_000 });
  });

  it('never generates a jobId containing ":" -- BullMQ rejects a custom jobId with one (rejects it against its own internal Redis key delimiter)', async () => {
    const queue = new FakeQueue();
    const adapter = new BullMqNotificationQueueAdapter(queue);

    await adapter.enqueueAppointmentReminder({
      accountId: '11111111-1111-4111-8111-111111111111',
      appointmentId: '22222222-2222-4222-8222-222222222222',
      scheduledAt: '2026-08-01T10:00:00.000Z',
      delayMs: 60_000,
    });

    assert.ok(queue.lastOptions?.jobId, 'jobId must be set');
    assert.equal((queue.lastOptions?.jobId as string).includes(':'), false);
  });

  it('clamps a negative delay to zero rather than scheduling into the past', async () => {
    const queue = new FakeQueue();
    const adapter = new BullMqNotificationQueueAdapter(queue);

    await adapter.enqueueAppointmentReminder({
      accountId: '11111111-1111-4111-8111-111111111111',
      appointmentId: '22222222-2222-4222-8222-222222222222',
      scheduledAt: '2026-08-01T10:00:00.000Z',
      delayMs: -5000,
    });

    assert.equal(queue.lastOptions?.delay, 0);
  });

  it('derives a stable jobId from the appointmentId (deduplicates a retried enqueue)', async () => {
    const queue = new FakeQueue();
    const adapter = new BullMqNotificationQueueAdapter(queue);

    await adapter.enqueueAppointmentReminder({
      accountId: '11111111-1111-4111-8111-111111111111',
      appointmentId: 'same-appointment',
      scheduledAt: '2026-08-01T10:00:00.000Z',
      delayMs: 1000,
    });
    const firstJobId = queue.lastOptions?.jobId;

    await adapter.enqueueAppointmentReminder({
      accountId: '11111111-1111-4111-8111-111111111111',
      appointmentId: 'same-appointment',
      scheduledAt: '2026-08-01T10:00:00.000Z',
      delayMs: 1000,
    });

    assert.equal(queue.lastOptions?.jobId, firstJobId);
  });

  describe('checkConnectivity', () => {
    it('resolves when the underlying Redis client is reachable', async () => {
      const queue = new FakeQueue(true);
      const adapter = new BullMqNotificationQueueAdapter(queue);

      await assert.doesNotReject(() => adapter.checkConnectivity());
    });

    it('rejects when the underlying Redis client is unreachable', async () => {
      const queue = new FakeQueue(false);
      const adapter = new BullMqNotificationQueueAdapter(queue);

      await assert.rejects(() => adapter.checkConnectivity());
    });
  });

  describe('onModuleDestroy', () => {
    it('closes the underlying queue, so a process that boots this module can actually exit', async () => {
      const queue = new FakeQueue();
      const adapter = new BullMqNotificationQueueAdapter(queue);

      await adapter.onModuleDestroy();

      assert.equal(queue.closeCallCount, 1);
    });
  });
});
