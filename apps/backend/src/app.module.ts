import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ConfigurationModule } from './core/configuration/configuration.module.js';
import { AllExceptionsFilter } from './platform/filters/all-exceptions.filter.js';
import { HealthModule } from './platform/health/health.module.js';
import { RequestLoggingInterceptor } from './platform/interceptors/request-logging.interceptor.js';
import { PinoLoggerService } from './platform/logging/pino-logger.service.js';
import { CorrelationIdMiddleware } from './platform/middleware/correlation-id.middleware.js';

@Module({
  imports: [ConfigurationModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), HealthModule],
  providers: [
    PinoLoggerService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
  exports: [PinoLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
