import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import type { EnvConfig } from '../../core/configuration/env.schema.js';
import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { PinoLoggerService } from '../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../authentication/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '../authentication/application/ports/tokens.js';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetFollowUpRecommendationForSessionUseCase } from '../consultation/application/use-cases/get-follow-up-recommendation-for-session/get-follow-up-recommendation-for-session.use-case.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { ListPrescriptionsForConsultationSessionUseCase } from '../clinical/application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import { ClinicalModule } from '../clinical/clinical.module.js';
import { GetAccountByIdUseCase } from '../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';

import { NOTIFICATION_QUEUE, NOTIFICATION_REPOSITORY } from './application/ports/tokens.js';
import type { EnqueueAppointmentReminderJob, NotificationQueuePort } from './application/ports/notification-queue.port.js';
import {
  ScheduleAppointmentReminderHandler,
  type AppointmentBookedEventPayload,
} from './application/event-handlers/schedule-appointment-reminder.handler.js';
import {
  NotifyConsultationCompletedHandler,
  type ConsultationCompletedEventPayload,
} from './application/event-handlers/notify-consultation-completed.handler.js';
import { ListNotificationsForAccountUseCase } from './application/use-cases/list-notifications-for-account/list-notifications-for-account.use-case.js';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read/mark-all-notifications-read.use-case.js';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read/mark-notification-read.use-case.js';
import { SendAppointmentReminderUseCase } from './application/use-cases/send-appointment-reminder/send-appointment-reminder.use-case.js';
import type { NotificationRepository } from './domain/repositories/notification.repository.js';
import { AppointmentReminderWorkerService } from './infrastructure/queue/appointment-reminder-worker.service.js';
import { BullMqNotificationQueueAdapter, NOTIFICATION_QUEUE_NAME } from './infrastructure/queue/bullmq-notification-queue.adapter.js';
import { NotConfiguredNotificationQueueAdapter } from './infrastructure/queue/not-configured-notification-queue.adapter.js';
import { PrismaNotificationRepository } from './infrastructure/prisma/prisma-notification.repository.js';
import { NotificationController } from './presentation/controllers/notification.controller.js';

// Imports ConsultationModule/PatientModule/IdentityModule only to consume
// their own exported use cases (module-to-module calls only through a
// published interface, never another module's repository --
// docs/10-backend-architecture.md Section 11). None of those modules
// import Notification back -- no circular imports, no forwardRef().
// AuthenticationModule is imported both for JwtAuthGuard/@CurrentUser() (as
// before) and, new this stage, to reuse its EMAIL_SENDER binding rather
// than a second email-sending path (docs/05-information-architecture.md's
// Notifications Domain: "Owns delivery only").
@Module({
  imports: [AuthenticationModule, ConsultationModule, ClinicalModule, PatientModule, IdentityModule],
  controllers: [NotificationController],
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    {
      provide: ListNotificationsForAccountUseCase,
      useFactory: (repository: NotificationRepository) => new ListNotificationsForAccountUseCase(repository),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: MarkNotificationReadUseCase,
      useFactory: (repository: NotificationRepository) => new MarkNotificationReadUseCase(repository),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: MarkAllNotificationsReadUseCase,
      useFactory: (repository: NotificationRepository) => new MarkAllNotificationsReadUseCase(repository),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      // ORIVEX Roadmap 2.0 Stage 3 -- Notifications Queue. Falls back to
      // NotConfiguredNotificationQueueAdapter whenever REDIS_URL is unset,
      // same fail-loud-not-fail-fake idiom as PaymentModule/
      // ConsultationModule's own external providers.
      provide: NOTIFICATION_QUEUE,
      useFactory: (configService: ConfigService<EnvConfig, true>): NotificationQueuePort => {
        const redisUrl = configService.get('REDIS_URL', { infer: true });
        if (!redisUrl) {
          return new NotConfiguredNotificationQueueAdapter();
        }
        const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
        const queue = new Queue<EnqueueAppointmentReminderJob>(NOTIFICATION_QUEUE_NAME, { connection });
        return new BullMqNotificationQueueAdapter(queue);
      },
      inject: [ConfigService],
    },
    {
      provide: SendAppointmentReminderUseCase,
      useFactory: (
        getAccountByIdUseCase: GetAccountByIdUseCase,
        notificationRepository: NotificationRepository,
        emailSender: EmailSenderPort,
      ) => new SendAppointmentReminderUseCase(getAccountByIdUseCase, notificationRepository, emailSender),
      inject: [GetAccountByIdUseCase, NOTIFICATION_REPOSITORY, EMAIL_SENDER],
    },
    // Runs the reminder job's processor in-process -- a no-op (see the
    // service's own onModuleInit) whenever REDIS_URL is unset.
    AppointmentReminderWorkerService,
    {
      // Registers Notification's own event subscriber against the shared
      // DomainEventDispatcher port (mirrors ClinicalModule's
      // AI_ACKNOWLEDGMENT_EVENT_SUBSCRIBER pattern exactly): reacts to
      // ConsultationModule's already-published 'consultation.appointment.
      // booked' event by name only, no import of ConsultationModule's
      // event type. Nest instantiates every provider in a module's
      // providers array once at bootstrap, so this factory's subscribe()
      // side effect runs exactly once, before any request is served.
      provide: ScheduleAppointmentReminderHandler,
      useFactory: (
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        notificationQueue: NotificationQueuePort,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new ScheduleAppointmentReminderHandler(
          getAppointmentByIdUseCase,
          getPatientProfileByIdUseCase,
          notificationQueue,
          logger,
        );
        dispatcher.subscribe('consultation.appointment.booked', (event: DomainEvent) =>
          handler.handle(event as unknown as AppointmentBookedEventPayload),
        );
        return handler;
      },
      inject: [GetAppointmentByIdUseCase, GetPatientProfileByIdUseCase, NOTIFICATION_QUEUE, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Consultation lifecycle completion follow-up (2026-07-26): same
      // by-name-only event-subscription pattern as
      // ScheduleAppointmentReminderHandler above -- reacts to
      // ConsultationModule's 'consultation.session.completed' event,
      // deliberately never 'consultation.session.interrupted' (see the
      // handler's own comment).
      provide: NotifyConsultationCompletedHandler,
      useFactory: (
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        listPrescriptionsForConsultationSessionUseCase: ListPrescriptionsForConsultationSessionUseCase,
        getFollowUpRecommendationForSessionUseCase: GetFollowUpRecommendationForSessionUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyConsultationCompletedHandler(
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getPatientProfileByIdUseCase,
          listPrescriptionsForConsultationSessionUseCase,
          getFollowUpRecommendationForSessionUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.session.completed', (event: DomainEvent) =>
          handler.handle(event as unknown as ConsultationCompletedEventPayload),
        );
        return handler;
      },
      inject: [
        GetConsultationSessionByIdUseCase,
        GetAppointmentByIdUseCase,
        GetPatientProfileByIdUseCase,
        ListPrescriptionsForConsultationSessionUseCase,
        GetFollowUpRecommendationForSessionUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
  ],
  // NOTIFICATION_QUEUE is exported for HealthController's GET /health/
  // readiness (platform/health/health.module.ts) to report the queue's
  // real connectivity status, mirroring OBJECT_STORAGE's own export for
  // the same reason.
  exports: [ListNotificationsForAccountUseCase, MarkNotificationReadUseCase, MarkAllNotificationsReadUseCase, NOTIFICATION_QUEUE],
})
export class NotificationModule {}
