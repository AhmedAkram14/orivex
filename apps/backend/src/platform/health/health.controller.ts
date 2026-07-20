import { Controller, Get, HttpCode, HttpStatus, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';

import type { EnvConfig } from '../../core/configuration/env.schema.js';
import type { ObjectStoragePort } from '../../modules/asset/application/ports/object-storage.port.js';
import { OBJECT_STORAGE } from '../../modules/asset/application/ports/tokens.js';
import type { NotificationQueuePort } from '../../modules/notification/application/ports/notification-queue.port.js';
import { NOTIFICATION_QUEUE } from '../../modules/notification/application/ports/tokens.js';
import { PrismaService } from '../database/prisma.service.js';

interface LivenessResponse {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

interface ReadinessResponse {
  status: 'ok';
  timestamp: string;
  checks: {
    database: 'ok';
    objectStorage: 'ok';
    // 'disabled' whenever REDIS_URL is unset -- intentionally never a
    // failure (ORIVEX Roadmap 2.0 Stage 3's own graceful-degradation
    // idiom: the app is fully ready without a queue configured). Only
    // 'ok' actually pings Redis; a configured-but-unreachable queue fails
    // readiness the same way an unreachable database does.
    queue: 'ok' | 'disabled';
    // Purely informational -- never fails readiness either way (a
    // missing email provider degrades to logging, never blocks the app).
    email: 'configured' | 'not configured';
  };
}

// Two distinct endpoints, deliberately not conflated (docs/13-engineering-
// bootstrap.md Section 12): liveness answers "is the process running" and
// must never depend on anything external -- a slow/unreachable dependency
// should trigger a readiness failure (taking the pod out of the load
// balancer), never a liveness failure (which would restart a perfectly
// healthy process for a problem restarting it can't fix). Readiness checks
// Postgres, S3-compatible object storage, and (ORIVEX Roadmap 2.0 Stage 3)
// the notification queue whenever Redis is actually configured -- all are
// dependencies the app actually uses at request time once configured.
// Email provider status is reported but never fails readiness, since a
// missing provider degrades to logging rather than breaking anything.
//
// Excluded from the global rate limiter: liveness/readiness probes poll
// this frequently, and shouldn't compete with real traffic for quota.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
    @Inject(NOTIFICATION_QUEUE) private readonly notificationQueue: NotificationQueuePort,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  check(): LivenessResponse {
    return this.liveness();
  }

  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  liveness(): LivenessResponse {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  async readiness(): Promise<ReadinessResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Database unreachable.';
      throw new ServiceUnavailableException(`Not ready: database unreachable (${reason}).`);
    }

    try {
      await this.objectStorage.checkConnectivity();
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Object storage unreachable.';
      throw new ServiceUnavailableException(`Not ready: object storage unreachable (${reason}).`);
    }

    let queueStatus: 'ok' | 'disabled' = 'disabled';
    if (this.configService.get('REDIS_URL', { infer: true })) {
      try {
        await this.notificationQueue.checkConnectivity();
        queueStatus = 'ok';
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Notification queue unreachable.';
        throw new ServiceUnavailableException(`Not ready: notification queue unreachable (${reason}).`);
      }
    }

    const emailStatus = this.configService.get('SENDGRID_API_KEY', { infer: true }) ? 'configured' : 'not configured';

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: { database: 'ok', objectStorage: 'ok', queue: queueStatus, email: emailStatus },
    };
  }
}
