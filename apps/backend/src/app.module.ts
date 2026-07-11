import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ConfigurationModule } from './core/configuration/configuration.module.js';
import { AdministrationModule } from './modules/administration/administration.module.js';
import { AIModule } from './modules/ai/ai.module.js';
import { AssetModule } from './modules/asset/asset.module.js';
import { ClinicalModule } from './modules/clinical/clinical.module.js';
import { ConsultationModule } from './modules/consultation/consultation.module.js';
import { DoctorModule } from './modules/doctor/doctor.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { PatientModule } from './modules/patient/patient.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { SchedulingModule } from './modules/scheduling/scheduling.module.js';
import { TrustModule } from './modules/trust/trust.module.js';
import { PrismaModule } from './platform/database/prisma.module.js';
import { EventsModule } from './platform/events/events.module.js';
import { AllExceptionsFilter } from './platform/filters/all-exceptions.filter.js';
import { HealthModule } from './platform/health/health.module.js';
import { RequestLoggingInterceptor } from './platform/interceptors/request-logging.interceptor.js';
import { LoggingModule } from './platform/logging/logging.module.js';
import { CorrelationIdMiddleware } from './platform/middleware/correlation-id.middleware.js';

@Module({
  imports: [
    ConfigurationModule,
    LoggingModule,
    PrismaModule,
    EventsModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    HealthModule,
    IdentityModule,
    DoctorModule,
    AssetModule,
    TrustModule,
    AdministrationModule,
    PatientModule,
    SchedulingModule,
    ConsultationModule,
    PaymentModule,
    ClinicalModule,
    AIModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
