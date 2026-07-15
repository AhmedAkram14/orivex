import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

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
  };
}

// Two distinct endpoints, deliberately not conflated (docs/13-engineering-
// bootstrap.md Section 12): liveness answers "is the process running" and
// must never depend on anything external -- a slow/unreachable dependency
// should trigger a readiness failure (taking the pod out of the load
// balancer), never a liveness failure (which would restart a perfectly
// healthy process for a problem restarting it can't fix). Readiness checks
// Postgres only -- Redis is a documented optional env var but nothing in
// this codebase actually connects to it yet, so checking it here would be
// a fake check against an unused dependency, not a real readiness signal.
//
// Excluded from the global rate limiter: liveness/readiness probes poll
// this frequently, and shouldn't compete with real traffic for quota.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: { database: 'ok' },
    };
  }
}
