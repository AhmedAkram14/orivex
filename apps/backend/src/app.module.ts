import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ConfigurationModule } from './core/configuration/configuration.module.js';
import { AdministrationModule } from './modules/administration/administration.module.js';
import { AIModule } from './modules/ai/ai.module.js';
import { AssetModule } from './modules/asset/asset.module.js';
import { AuthenticationModule } from './modules/authentication/authentication.module.js';
import { ClinicalModule } from './modules/clinical/clinical.module.js';
import { ConsultationModule } from './modules/consultation/consultation.module.js';
import { DoctorModule } from './modules/doctor/doctor.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { PatientModule } from './modules/patient/patient.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { PublicModule } from './modules/public/public.module.js';
import { ReferenceModule } from './modules/reference/reference.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { SchedulingModule } from './modules/scheduling/scheduling.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { TrustModule } from './modules/trust/trust.module.js';
import { PrismaModule } from './platform/database/prisma.module.js';
import { EventsModule } from './platform/events/events.module.js';
import { AllExceptionsFilter } from './platform/filters/all-exceptions.filter.js';
import { HealthModule } from './platform/health/health.module.js';
import { RequestLoggingInterceptor } from './platform/interceptors/request-logging.interceptor.js';
import { LoggingModule } from './platform/logging/logging.module.js';
import { CorrelationIdMiddleware } from './platform/middleware/correlation-id.middleware.js';
import { RealtimeModule } from './platform/realtime/realtime.module.js';

@Module({
  imports: [
    ConfigurationModule,
    LoggingModule,
    PrismaModule,
    EventsModule,
    RealtimeModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    HealthModule,
    IdentityModule,
    TrustModule,
    AuthenticationModule,
    DoctorModule,
    AssetModule,
    AdministrationModule,
    ReferenceModule,
    PatientModule,
    SchedulingModule,
    ConsultationModule,
    PaymentModule,
    ClinicalModule,
    AIModule,
    NotificationModule,
    PublicModule,
    ReportingModule,
    SearchModule,
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
