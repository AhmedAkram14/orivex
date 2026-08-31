import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Queue } from 'bullmq';

import type { EnqueueAppointmentReminderJob, NotificationQueuePort } from '../../application/ports/notification-queue.port.js';

export const NOTIFICATION_QUEUE_NAME = 'notifications';
export const APPOINTMENT_REMINDER_JOB_NAME = 'appointment-reminder';

// The narrow slice of BullMQ's Queue this adapter actually calls -- narrowed
// down so a hand-written fake can implement it in tests (this codebase's
// established convention: no mocking library, a real object implementing
// the real shape), matching StripeClient/RoomTokenGeneratorPort's own
// pattern. Unlike LiveKit's AccessToken (pure local signing), a real
// BullMQ Queue always needs a live Redis connection even to construct, so
// there is no way to exercise the real class directly in tests -- this
// interface is what makes the adapter's own logic (job name, delay
// computation, payload shape) testable without one.
export type QueueLike = Pick<Queue<EnqueueAppointmentReminderJob>, 'add' | 'client' | 'close'>;

// Real background-job queue provider (ORIVEX Roadmap 2.0 implementation
// program, Stage 3). Bound in notification.module.ts only when REDIS_URL
// is set; the BullMQ Queue instance (and its Redis connection) is
// constructed once in that module's factory, not here -- this adapter's
// own dependency stays injectable/testable (Ports & Adapters: the
// adapter's own external dependency should be substitutable).
@Injectable()
export class BullMqNotificationQueueAdapter implements NotificationQueuePort, OnModuleDestroy {
  constructor(private readonly queue: QueueLike) {}

  // Closes the Queue's own Redis connection, opened once in
  // notification.module.ts's factory -- without this, nothing ever calls
  // it, so a process that boots this module (the HTTP server, or a
  // one-off script via NestFactory.createApplicationContext) never exits
  // on its own even after app.close(): the open Redis socket keeps
  // Node's event loop alive indefinitely.
  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  async enqueueAppointmentReminder(job: EnqueueAppointmentReminderJob): Promise<void> {
    await this.queue.add(APPOINTMENT_REMINDER_JOB_NAME, job, {
      delay: Math.max(job.delayMs, 0),
      // A reminder that's somehow already been delivered (e.g. a retried
      // enqueue call for the same appointment) should never send twice --
      // BullMQ deduplicates by jobId within the same queue. `:` is reserved
      // by BullMQ for its own internal Redis key construction (`bull:
      // <queue>:<jobId>`) and is rejected outright in a custom jobId --
      // confirmed live against local Redis (`Custom Id cannot contain :`)
      // during the real-database demo seeding pass -- so `-` is the
      // delimiter here, not `:`.
      jobId: `${APPOINTMENT_REMINDER_JOB_NAME}-${job.appointmentId}`,
      // A transient failure (e.g. SendGrid briefly unreachable) gets 3
      // attempts with exponential backoff before the job is given up on --
      // removeOnFail only removes it after every attempt is exhausted, not
      // on the first failure.
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  async checkConnectivity(): Promise<void> {
    const client = await this.queue.client;
    // BullMQ's IRedisClient interface (adapter-agnostic across ioredis/
    // node-redis/Bun) doesn't declare PING, but INFO is part of the same
    // interface and equally requires a real round-trip to Redis to
    // resolve -- either proves connectivity.
    await client.info();
  }
}
