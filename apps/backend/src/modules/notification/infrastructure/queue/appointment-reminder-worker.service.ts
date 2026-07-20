import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EnqueueAppointmentReminderJob } from '../../application/ports/notification-queue.port.js';
import { SendAppointmentReminderCommand } from '../../application/use-cases/send-appointment-reminder/send-appointment-reminder.command.js';
import { SendAppointmentReminderUseCase } from '../../application/use-cases/send-appointment-reminder/send-appointment-reminder.use-case.js';

import { APPOINTMENT_REMINDER_JOB_NAME, NOTIFICATION_QUEUE_NAME } from './bullmq-notification-queue.adapter.js';

// Runs the appointment-reminder job's processor in the same Node process as
// the HTTP server -- no second deployable service (ORIVEX Roadmap 2.0's
// cross-cutting rule: no stage introduces a second queue/transport beyond
// what this one establishes). A deliberate no-op whenever REDIS_URL is
// unset (never constructs a real BullMQ Worker/Redis connection) --
// mirrors NotConfiguredNotificationQueueAdapter's own silence: there is
// nothing to process if nothing can ever be enqueued.
@Injectable()
export class AppointmentReminderWorkerService implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<EnqueueAppointmentReminderJob> | undefined;

  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly sendAppointmentReminderUseCase: SendAppointmentReminderUseCase,
    private readonly logger: PinoLoggerService,
  ) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get('REDIS_URL', { infer: true });
    if (!redisUrl) {
      return;
    }

    // BullMQ requires maxRetriesPerRequest: null on a Worker's own
    // connection (its own documented requirement -- blocking commands used
    // internally are incompatible with ioredis's default retry behavior).
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.worker = new Worker<EnqueueAppointmentReminderJob>(
      NOTIFICATION_QUEUE_NAME,
      async (job) => {
        if (job.name !== APPOINTMENT_REMINDER_JOB_NAME) {
          return;
        }
        await this.sendAppointmentReminderUseCase.execute(
          new SendAppointmentReminderCommand({ accountId: job.data.accountId, scheduledAt: job.data.scheduledAt }),
        );
      },
      { connection },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error('Appointment reminder job failed', error.stack, { jobId: job?.id });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
