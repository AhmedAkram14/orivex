import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import type { EnvConfig } from '../../core/configuration/env.schema.js';
import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { PinoLoggerService } from '../../platform/logging/pino-logger.service.js';
import type { RealtimeEmitterPort } from '../../platform/realtime/ports/realtime-emitter.port.js';
import { REALTIME_EMITTER } from '../../platform/realtime/ports/tokens.js';
import type { EmailSenderPort } from '../authentication/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '../authentication/application/ports/tokens.js';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetFollowUpRecommendationForSessionUseCase } from '../consultation/application/use-cases/get-follow-up-recommendation-for-session/get-follow-up-recommendation-for-session.use-case.js';
import { GetConsultationFeedbackForSessionUseCase } from '../consultation/application/use-cases/get-consultation-feedback-for-session/get-consultation-feedback-for-session.use-case.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { ListPrescriptionsForConsultationSessionUseCase } from '../clinical/application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import { ClinicalModule } from '../clinical/clinical.module.js';
import { GetAccountByIdUseCase } from '../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { ListAccountsUseCase } from '../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { GetPaymentTransactionByIdUseCase } from '../payment/application/use-cases/get-payment-transaction-by-id/get-payment-transaction-by-id.use-case.js';
import { PaymentModule } from '../payment/payment.module.js';
import { GetPrescriptionByIdUseCase } from '../clinical/application/use-cases/get-prescription-by-id/get-prescription-by-id.use-case.js';
import { PrismaService } from '../../platform/database/prisma.service.js';

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
import {
  NotifyAdminsOfVerificationSubmittedHandler,
  type VerificationCaseSubmittedEventPayload,
} from './application/event-handlers/notify-admins-of-verification-submitted.handler.js';
import {
  NotifyApplicantOfVerificationDecisionHandler,
  type VerificationCaseDecidedEventPayload,
} from './application/event-handlers/notify-applicant-of-verification-decision.handler.js';
import {
  NotifyDoctorOfAppointmentRequestedHandler,
  type AppointmentRequestedEventPayload,
} from './application/event-handlers/notify-doctor-of-appointment-requested.handler.js';
import {
  NotifyPatientOfAppointmentConfirmedHandler,
  type AppointmentConfirmedEventPayload,
} from './application/event-handlers/notify-patient-of-appointment-confirmed.handler.js';
import {
  NotifyPatientOfPaymentCompletedHandler,
  type PaymentCompletedEventPayload,
} from './application/event-handlers/notify-patient-of-payment-completed.handler.js';
import {
  NotifyPatientOfRefundIssuedHandler,
  type RefundIssuedEventPayload,
} from './application/event-handlers/notify-patient-of-refund-issued.handler.js';
import {
  NotifyPatientOfPrescriptionSignedHandler,
  type PrescriptionSignedEventPayload,
} from './application/event-handlers/notify-patient-of-prescription-signed.handler.js';
import {
  NotifyOfConsultationInterruptedHandler,
  type ConsultationInterruptedEventPayload,
} from './application/event-handlers/notify-of-consultation-interrupted.handler.js';
import {
  NotifyPatientOfAppointmentCancelledHandler,
  type AppointmentCancelledEventPayload,
} from './application/event-handlers/notify-patient-of-appointment-cancelled.handler.js';
import {
  NotifyDoctorOfAppointmentCancelledHandler,
  type DoctorAppointmentCancelledEventPayload,
} from './application/event-handlers/notify-doctor-of-appointment-cancelled.handler.js';
import {
  NotifyPatientOfAppointmentRescheduledHandler,
  type AppointmentRescheduledEventPayload,
} from './application/event-handlers/notify-patient-of-appointment-rescheduled.handler.js';
import {
  NotifyDoctorOfAppointmentRescheduledHandler,
  type DoctorAppointmentRescheduledEventPayload,
} from './application/event-handlers/notify-doctor-of-appointment-rescheduled.handler.js';
import {
  NotifyDoctorOfConsultationFeedbackSubmittedHandler,
  type ConsultationFeedbackSubmittedEventPayload,
} from './application/event-handlers/notify-doctor-of-consultation-feedback-submitted.handler.js';
import {
  NotifyOfAccountCreatedHandler,
  type AccountCreatedEventPayload,
} from './application/event-handlers/notify-of-account-created.handler.js';
import {
  NotifyOfPasswordChangedHandler,
  type PasswordChangedEventPayload,
} from './application/event-handlers/notify-of-password-changed.handler.js';
import {
  NotifyOfAccountLockedHandler,
  type AccountLockedEventPayload,
} from './application/event-handlers/notify-of-account-locked.handler.js';
import {
  NotifyOfDoctorRolePromotionHandler,
  type DoctorVerifiedEventPayload,
} from './application/event-handlers/notify-of-doctor-role-promotion.handler.js';
import {
  NotifyApplicantOfVerificationSuspensionHandler,
  type VerificationCaseSuspendedEventPayload,
} from './application/event-handlers/notify-applicant-of-verification-suspension.handler.js';
import { ListNotificationsForAccountUseCase } from './application/use-cases/list-notifications-for-account/list-notifications-for-account.use-case.js';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read/mark-all-notifications-read.use-case.js';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read/mark-notification-read.use-case.js';
import { SendAppointmentReminderUseCase } from './application/use-cases/send-appointment-reminder/send-appointment-reminder.use-case.js';
import type { NotificationRepository } from './domain/repositories/notification.repository.js';
import { AppointmentReminderWorkerService } from './infrastructure/queue/appointment-reminder-worker.service.js';
import { BullMqNotificationQueueAdapter, NOTIFICATION_QUEUE_NAME } from './infrastructure/queue/bullmq-notification-queue.adapter.js';
import { NotConfiguredNotificationQueueAdapter } from './infrastructure/queue/not-configured-notification-queue.adapter.js';
import { PrismaNotificationRepository } from './infrastructure/prisma/prisma-notification.repository.js';
import { RealtimeNotifyingNotificationRepository } from './infrastructure/realtime/realtime-notifying-notification.repository.js';
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
  imports: [AuthenticationModule, ConsultationModule, ClinicalModule, PatientModule, IdentityModule, DoctorModule, PaymentModule],
  controllers: [NotificationController],
  providers: [
    {
      // Wraps the real repository with a single, central live-push point
      // (RealtimeNotifyingNotificationRepository's own comment) -- every
      // notification producer just calls `save()` as it always has, none
      // of them need their own RealtimeEmitterPort wiring.
      provide: NOTIFICATION_REPOSITORY,
      useFactory: (prisma: PrismaService, realtimeEmitter: RealtimeEmitterPort) =>
        new RealtimeNotifyingNotificationRepository(new PrismaNotificationRepository(prisma), realtimeEmitter),
      inject: [PrismaService, REALTIME_EMITTER],
    },
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
    {
      // Same by-name-only event-subscription pattern as the two handlers
      // above -- reacts to TrustModule's 'verification.case.submitted'
      // event, fanning out to every SuperAdmin account (the first fan-out
      // notification in this module; every other handler here is 1:1).
      provide: NotifyAdminsOfVerificationSubmittedHandler,
      useFactory: (
        listAccountsUseCase: ListAccountsUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyAdminsOfVerificationSubmittedHandler(listAccountsUseCase, notificationRepository, logger);
        dispatcher.subscribe('verification.case.submitted', (event: DomainEvent) =>
          handler.handle(event as unknown as VerificationCaseSubmittedEventPayload),
        );
        return handler;
      },
      inject: [ListAccountsUseCase, NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Same by-name-only event-subscription pattern as the handlers above
      // -- reacts to TrustModule's 'verification.case.decided' event
      // (Rejected/MoreInfoNeeded only; see the handler's own comment on why
      // Approved is deliberately excluded), notifying the single applicant
      // 1:1, unlike the admin fan-out above.
      provide: NotifyApplicantOfVerificationDecisionHandler,
      useFactory: (notificationRepository: NotificationRepository, logger: PinoLoggerService, dispatcher: DomainEventDispatcher) => {
        const handler = new NotifyApplicantOfVerificationDecisionHandler(notificationRepository, logger);
        dispatcher.subscribe('verification.case.decided', (event: DomainEvent) =>
          handler.handle(event as unknown as VerificationCaseDecidedEventPayload),
        );
        return handler;
      },
      inject: [NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // A second subscriber on the same 'consultation.appointment.booked'
      // event ScheduleAppointmentReminderHandler already reacts to (the
      // dispatcher supports multiple handlers per event name) -- that one
      // schedules the patient's own reminder, this one tells the doctor a
      // new request needs their approval.
      provide: NotifyDoctorOfAppointmentRequestedHandler,
      useFactory: (
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        getAccountByIdUseCase: GetAccountByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyDoctorOfAppointmentRequestedHandler(
          getAppointmentByIdUseCase,
          getDoctorProfileByIdUseCase,
          getPatientProfileByIdUseCase,
          getAccountByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.appointment.booked', (event: DomainEvent) =>
          handler.handle(event as unknown as AppointmentRequestedEventPayload),
        );
        return handler;
      },
      inject: [
        GetAppointmentByIdUseCase,
        GetDoctorProfileByIdUseCase,
        GetPatientProfileByIdUseCase,
        GetAccountByIdUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      // Reacts to ConsultationModule's 'consultation.appointment.confirmed'
      // event (raised only from the doctor's approval path now -- see
      // Appointment.confirm()'s own comment), telling the patient their
      // request was approved.
      provide: NotifyPatientOfAppointmentConfirmedHandler,
      useFactory: (
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyPatientOfAppointmentConfirmedHandler(
          getAppointmentByIdUseCase,
          getPatientProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.appointment.confirmed', (event: DomainEvent) =>
          handler.handle(event as unknown as AppointmentConfirmedEventPayload),
        );
        return handler;
      },
      inject: [
        GetAppointmentByIdUseCase,
        GetPatientProfileByIdUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      // Reacts to PaymentModule's 'payment.transaction.completed' event --
      // existed since Stage 1 but nothing ever subscribed to it.
      provide: NotifyPatientOfPaymentCompletedHandler,
      useFactory: (
        getPaymentTransactionByIdUseCase: GetPaymentTransactionByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyPatientOfPaymentCompletedHandler(
          getPaymentTransactionByIdUseCase,
          getPatientProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('payment.transaction.completed', (event: DomainEvent) =>
          handler.handle(event as unknown as PaymentCompletedEventPayload),
        );
        return handler;
      },
      inject: [
        GetPaymentTransactionByIdUseCase,
        GetPatientProfileByIdUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      // Reacts to PaymentModule's 'payment.transaction.refund-issued' event
      // -- existed since Stage 1 but nothing ever subscribed to it.
      provide: NotifyPatientOfRefundIssuedHandler,
      useFactory: (
        getPaymentTransactionByIdUseCase: GetPaymentTransactionByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyPatientOfRefundIssuedHandler(
          getPaymentTransactionByIdUseCase,
          getPatientProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('payment.transaction.refund-issued', (event: DomainEvent) =>
          handler.handle(event as unknown as RefundIssuedEventPayload),
        );
        return handler;
      },
      inject: [
        GetPaymentTransactionByIdUseCase,
        GetPatientProfileByIdUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      // Critical Lifecycle Gaps (Phase 3, Step 2): reacts to
      // ConsultationModule's 'consultation.appointment.cancelled' event --
      // existed since the cancel() path was added but only PaymentModule
      // ever subscribed to it (for the automatic-refund rule, now
      // unconditional for both doctor- and patient-initiated cancellation);
      // nothing in NotificationModule did until now.
      provide: NotifyPatientOfAppointmentCancelledHandler,
      useFactory: (
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyPatientOfAppointmentCancelledHandler(
          getAppointmentByIdUseCase,
          getPatientProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.appointment.cancelled', (event: DomainEvent) =>
          handler.handle(event as unknown as AppointmentCancelledEventPayload),
        );
        return handler;
      },
      inject: [
        GetAppointmentByIdUseCase,
        GetPatientProfileByIdUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      // UX Reliability Pass: the counterpart to
      // NotifyPatientOfAppointmentCancelledHandler above, which only ever
      // notified the patient -- a doctor previously had no way to learn a
      // patient had cancelled short of noticing it missing from their queue.
      // A second subscriber on the same event (the dispatcher supports
      // multiple handlers per event name); only fires when cancelledBy ===
      // 'patient' so a doctor never self-notifies.
      provide: NotifyDoctorOfAppointmentCancelledHandler,
      useFactory: (
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyDoctorOfAppointmentCancelledHandler(
          getAppointmentByIdUseCase,
          getDoctorProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.appointment.cancelled', (event: DomainEvent) =>
          handler.handle(event as unknown as DoctorAppointmentCancelledEventPayload),
        );
        return handler;
      },
      inject: [GetAppointmentByIdUseCase, GetDoctorProfileByIdUseCase, NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Critical Lifecycle Gaps (Phase 3, Step 2): reacts to
      // ConsultationModule's 'consultation.appointment.rescheduled' event
      // (only dispatched when the old appointment was Confirmed/paid).
      provide: NotifyPatientOfAppointmentRescheduledHandler,
      useFactory: (
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyPatientOfAppointmentRescheduledHandler(
          getAppointmentByIdUseCase,
          getPatientProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.appointment.rescheduled', (event: DomainEvent) =>
          handler.handle(event as unknown as AppointmentRescheduledEventPayload),
        );
        return handler;
      },
      inject: [
        GetAppointmentByIdUseCase,
        GetPatientProfileByIdUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      // UX Reliability Pass: the counterpart to
      // NotifyPatientOfAppointmentRescheduledHandler above, which only ever
      // notified the patient. A second subscriber on the same event; only
      // fires when rescheduledByRole === 'patient' so a doctor never
      // self-notifies when rescheduling their own patient's appointment.
      provide: NotifyDoctorOfAppointmentRescheduledHandler,
      useFactory: (
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyDoctorOfAppointmentRescheduledHandler(
          getAppointmentByIdUseCase,
          getDoctorProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.appointment.rescheduled', (event: DomainEvent) =>
          handler.handle(event as unknown as DoctorAppointmentRescheduledEventPayload),
        );
        return handler;
      },
      inject: [GetAppointmentByIdUseCase, GetDoctorProfileByIdUseCase, NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Reacts to ClinicalModule's 'clinical.prescription.signed' event --
      // existed since ClinicalModule's own Stage work but nothing ever
      // subscribed to it.
      provide: NotifyPatientOfPrescriptionSignedHandler,
      useFactory: (
        getPrescriptionByIdUseCase: GetPrescriptionByIdUseCase,
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyPatientOfPrescriptionSignedHandler(
          getPrescriptionByIdUseCase,
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getPatientProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('clinical.prescription.signed', (event: DomainEvent) =>
          handler.handle(event as unknown as PrescriptionSignedEventPayload),
        );
        return handler;
      },
      inject: [
        GetPrescriptionByIdUseCase,
        GetConsultationSessionByIdUseCase,
        GetAppointmentByIdUseCase,
        GetPatientProfileByIdUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      // Reacts to ConsultationModule's 'consultation.session.interrupted'
      // event -- existed since the consultation-lifecycle work but nothing
      // ever subscribed to it. Deliberately separate from
      // NotifyConsultationCompletedHandler (never subscribes to
      // 'completed', this never subscribes to 'interrupted') -- the two
      // outcomes get different copy and, here, both parties are notified.
      provide: NotifyOfConsultationInterruptedHandler,
      useFactory: (
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyOfConsultationInterruptedHandler(
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getPatientProfileByIdUseCase,
          getDoctorProfileByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.session.interrupted', (event: DomainEvent) =>
          handler.handle(event as unknown as ConsultationInterruptedEventPayload),
        );
        return handler;
      },
      inject: [
        GetConsultationSessionByIdUseCase,
        GetAppointmentByIdUseCase,
        GetPatientProfileByIdUseCase,
        GetDoctorProfileByIdUseCase,
        NOTIFICATION_REPOSITORY,
        PinoLoggerService,
        DOMAIN_EVENT_DISPATCHER,
      ],
    },
    {
      // Reacts to IdentityModule's 'identity.account.created' event -- a
      // welcome notification, the first thing a new account sees.
      provide: NotifyOfAccountCreatedHandler,
      useFactory: (notificationRepository: NotificationRepository, logger: PinoLoggerService, dispatcher: DomainEventDispatcher) => {
        const handler = new NotifyOfAccountCreatedHandler(notificationRepository, logger);
        dispatcher.subscribe('identity.account.created', (event: DomainEvent) =>
          handler.handle(event as unknown as AccountCreatedEventPayload),
        );
        return handler;
      },
      inject: [NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Reacts to AuthenticationModule's 'authentication.password.changed'
      // event -- a security-relevant notification the account holder needs
      // even if they weren't the one who changed it.
      provide: NotifyOfPasswordChangedHandler,
      useFactory: (notificationRepository: NotificationRepository, logger: PinoLoggerService, dispatcher: DomainEventDispatcher) => {
        const handler = new NotifyOfPasswordChangedHandler(notificationRepository, logger);
        dispatcher.subscribe('authentication.password.changed', (event: DomainEvent) =>
          handler.handle(event as unknown as PasswordChangedEventPayload),
        );
        return handler;
      },
      inject: [NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Reacts to AuthenticationModule's 'authentication.account.locked'
      // event -- a security-relevant notification for a lockout, whether
      // it was the account holder mistyping a password or someone else
      // trying to break in.
      provide: NotifyOfAccountLockedHandler,
      useFactory: (notificationRepository: NotificationRepository, logger: PinoLoggerService, dispatcher: DomainEventDispatcher) => {
        const handler = new NotifyOfAccountLockedHandler(notificationRepository, logger);
        dispatcher.subscribe('authentication.account.locked', (event: DomainEvent) =>
          handler.handle(event as unknown as AccountLockedEventPayload),
        );
        return handler;
      },
      inject: [NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Reacts to TrustModule's 'doctor.verified' event (mirrors
      // DoctorModule's own PromoteDoctorRoleOnVerificationHandler
      // subscription to the same event by name only -- neither handler
      // imports TrustModule, and TrustModule stays unaware either exists).
      // Tells the newly-promoted doctor their account now has Doctor
      // Workspace access -- previously nothing in NotificationModule
      // subscribed to this event at all.
      provide: NotifyOfDoctorRolePromotionHandler,
      useFactory: (notificationRepository: NotificationRepository, logger: PinoLoggerService, dispatcher: DomainEventDispatcher) => {
        const handler = new NotifyOfDoctorRolePromotionHandler(notificationRepository, logger);
        dispatcher.subscribe('doctor.verified', (event: DomainEvent) =>
          handler.handle(event as unknown as DoctorVerifiedEventPayload),
        );
        return handler;
      },
      inject: [NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // Reacts to TrustModule's 'verification.case.suspended' event (new
      // this stage -- VerificationCase.suspend() previously raised no event
      // at all, so a suspension was never notified). Mirrors
      // NotifyApplicantOfVerificationDecisionHandler's exact by-name-only
      // subscription shape, 1:1 to the single applicant.
      provide: NotifyApplicantOfVerificationSuspensionHandler,
      useFactory: (notificationRepository: NotificationRepository, logger: PinoLoggerService, dispatcher: DomainEventDispatcher) => {
        const handler = new NotifyApplicantOfVerificationSuspensionHandler(notificationRepository, logger);
        dispatcher.subscribe('verification.case.suspended', (event: DomainEvent) =>
          handler.handle(event as unknown as VerificationCaseSuspendedEventPayload),
        );
        return handler;
      },
      inject: [NOTIFICATION_REPOSITORY, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
    {
      // UX Reliability Pass: ConsultationFeedbackSubmittedEvent's own
      // comment already said "Notification module can subscribe to this to
      // tell the doctor feedback was received" -- nothing did until now.
      // Reacts to ConsultationModule's 'consultation.feedback.submitted'
      // event by name only, mirroring every other handler's cross-module
      // boundary.
      provide: NotifyDoctorOfConsultationFeedbackSubmittedHandler,
      useFactory: (
        getConsultationFeedbackForSessionUseCase: GetConsultationFeedbackForSessionUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        getAccountByIdUseCase: GetAccountByIdUseCase,
        notificationRepository: NotificationRepository,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new NotifyDoctorOfConsultationFeedbackSubmittedHandler(
          getConsultationFeedbackForSessionUseCase,
          getDoctorProfileByIdUseCase,
          getPatientProfileByIdUseCase,
          getAccountByIdUseCase,
          notificationRepository,
          logger,
        );
        dispatcher.subscribe('consultation.feedback.submitted', (event: DomainEvent) =>
          handler.handle(event as unknown as ConsultationFeedbackSubmittedEventPayload),
        );
        return handler;
      },
      inject: [
        GetConsultationFeedbackForSessionUseCase,
        GetDoctorProfileByIdUseCase,
        GetPatientProfileByIdUseCase,
        GetAccountByIdUseCase,
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
