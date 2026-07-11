import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

// Sprint 1.0: application-level health only. Postgres/Redis readiness
// checks are added in Sprint 1.1, Keycloak readiness in Sprint 1.2 once
// authentication infrastructure exists (per architect decision).
//
// Excluded from the global rate limiter: liveness/readiness probes poll
// this frequently, and shouldn't compete with real traffic for quota.
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): HealthResponse {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
