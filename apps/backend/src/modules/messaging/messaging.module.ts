import { Module } from '@nestjs/common';

import type { RealtimeEmitterPort } from '../../platform/realtime/ports/realtime-emitter.port.js';
import { REALTIME_EMITTER } from '../../platform/realtime/ports/tokens.js';
import { PrismaService } from '../../platform/database/prisma.service.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { FindAppointmentByPatientAndDoctorUseCase } from '../consultation/application/use-cases/find-appointment-by-patient-and-doctor/find-appointment-by-patient-and-doctor.use-case.js';
import { GetAppointmentsForDoctorAndPatientUseCase } from '../consultation/application/use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetDoctorProfileByAccountIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';
import { PatientModule } from '../patient/patient.module.js';
import { GetPatientProfileByAccountIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';

import { MESSAGE_REPOSITORY, MESSAGE_THREAD_REPOSITORY } from './application/ports/tokens.js';
import { GetMessageThreadByIdUseCase } from './application/use-cases/get-message-thread-by-id/get-message-thread-by-id.use-case.js';
import { GetUnreadCountForAccountUseCase } from './application/use-cases/get-unread-count-for-account/get-unread-count-for-account.use-case.js';
import { ListAppointmentsForThreadUseCase } from './application/use-cases/list-appointments-for-thread/list-appointments-for-thread.use-case.js';
import { ListMessageThreadsForAccountUseCase } from './application/use-cases/list-message-threads-for-account/list-message-threads-for-account.use-case.js';
import { ListMessagesForThreadUseCase } from './application/use-cases/list-messages-for-thread/list-messages-for-thread.use-case.js';
import { MarkThreadMessagesReadUseCase } from './application/use-cases/mark-thread-messages-read/mark-thread-messages-read.use-case.js';
import { SendMessageUseCase } from './application/use-cases/send-message/send-message.use-case.js';
import { StartOrGetMessageThreadUseCase } from './application/use-cases/start-or-get-message-thread/start-or-get-message-thread.use-case.js';
import type { MessageRepository } from './domain/repositories/message.repository.js';
import type { MessageThreadRepository } from './domain/repositories/message-thread.repository.js';
import { PrismaMessageRepository } from './infrastructure/prisma/prisma-message.repository.js';
import { PrismaMessageThreadRepository } from './infrastructure/prisma/prisma-message-thread.repository.js';
import { RealtimeNotifyingMessageRepository } from './infrastructure/realtime/realtime-notifying-message.repository.js';
import { MessageThreadController } from './presentation/controllers/message-thread.controller.js';

// I7 -- Messaging (docs/01-prd.md §2.13). Imports ConsultationModule (the
// re-threading (Phase 1) eligibility check and thread-header appointment
// context), DoctorModule, PatientModule (resolving a caller's own account id
// to their profile id, and a counterparty profile id to its display name),
// and IdentityModule (resolving an account's own display name) only to
// consume their own exported use cases (module-to-module calls only through
// a published interface, never another module's repository --
// docs/10-backend-architecture.md Section 11). None of those modules import
// MessagingModule back -- no circular imports, no forwardRef().
@Module({
  imports: [ConsultationModule, DoctorModule, PatientModule, IdentityModule, AuthenticationGuardsModule],
  controllers: [MessageThreadController],
  providers: [
    { provide: MESSAGE_THREAD_REPOSITORY, useClass: PrismaMessageThreadRepository },
    {
      // Realtime layer (Phase 2): wraps PrismaMessageRepository with the
      // same single, central live-push point NotificationModule already
      // established (RealtimeNotifyingMessageRepository's own comment) --
      // SendMessageUseCase/MarkThreadMessagesReadUseCase just call
      // save()/saveAllAndMarkThreadRead() as they always have.
      provide: MESSAGE_REPOSITORY,
      useFactory: (
        prisma: PrismaService,
        realtimeEmitter: RealtimeEmitterPort,
        threadRepository: MessageThreadRepository,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
      ) =>
        new RealtimeNotifyingMessageRepository(
          new PrismaMessageRepository(prisma),
          realtimeEmitter,
          threadRepository,
          getPatientProfileByIdUseCase,
          getDoctorProfileByIdUseCase,
        ),
      inject: [PrismaService, REALTIME_EMITTER, MESSAGE_THREAD_REPOSITORY, GetPatientProfileByIdUseCase, GetDoctorProfileByIdUseCase],
    },
    {
      provide: StartOrGetMessageThreadUseCase,
      useFactory: (
        threadRepository: MessageThreadRepository,
        findAppointmentByPatientAndDoctorUseCase: FindAppointmentByPatientAndDoctorUseCase,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) =>
        new StartOrGetMessageThreadUseCase(
          threadRepository,
          findAppointmentByPatientAndDoctorUseCase,
          getPatientProfileByAccountIdUseCase,
          getDoctorProfileByAccountIdUseCase,
        ),
      inject: [
        MESSAGE_THREAD_REPOSITORY,
        FindAppointmentByPatientAndDoctorUseCase,
        GetPatientProfileByAccountIdUseCase,
        GetDoctorProfileByAccountIdUseCase,
      ],
    },
    {
      provide: ListMessageThreadsForAccountUseCase,
      useFactory: (
        threadRepository: MessageThreadRepository,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) => new ListMessageThreadsForAccountUseCase(threadRepository, getPatientProfileByAccountIdUseCase, getDoctorProfileByAccountIdUseCase),
      inject: [MESSAGE_THREAD_REPOSITORY, GetPatientProfileByAccountIdUseCase, GetDoctorProfileByAccountIdUseCase],
    },
    {
      provide: GetMessageThreadByIdUseCase,
      useFactory: (threadRepository: MessageThreadRepository) => new GetMessageThreadByIdUseCase(threadRepository),
      inject: [MESSAGE_THREAD_REPOSITORY],
    },
    {
      provide: ListMessagesForThreadUseCase,
      useFactory: (
        messageRepository: MessageRepository,
        threadRepository: MessageThreadRepository,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) =>
        new ListMessagesForThreadUseCase(
          messageRepository,
          threadRepository,
          getPatientProfileByAccountIdUseCase,
          getDoctorProfileByAccountIdUseCase,
        ),
      inject: [MESSAGE_REPOSITORY, MESSAGE_THREAD_REPOSITORY, GetPatientProfileByAccountIdUseCase, GetDoctorProfileByAccountIdUseCase],
    },
    {
      provide: SendMessageUseCase,
      useFactory: (
        messageRepository: MessageRepository,
        threadRepository: MessageThreadRepository,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) =>
        new SendMessageUseCase(
          messageRepository,
          threadRepository,
          getPatientProfileByAccountIdUseCase,
          getDoctorProfileByAccountIdUseCase,
        ),
      inject: [MESSAGE_REPOSITORY, MESSAGE_THREAD_REPOSITORY, GetPatientProfileByAccountIdUseCase, GetDoctorProfileByAccountIdUseCase],
    },
    {
      provide: MarkThreadMessagesReadUseCase,
      useFactory: (
        messageRepository: MessageRepository,
        threadRepository: MessageThreadRepository,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) =>
        new MarkThreadMessagesReadUseCase(
          messageRepository,
          threadRepository,
          getPatientProfileByAccountIdUseCase,
          getDoctorProfileByAccountIdUseCase,
        ),
      inject: [MESSAGE_REPOSITORY, MESSAGE_THREAD_REPOSITORY, GetPatientProfileByAccountIdUseCase, GetDoctorProfileByAccountIdUseCase],
    },
    {
      provide: GetUnreadCountForAccountUseCase,
      useFactory: (
        messageRepository: MessageRepository,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) => new GetUnreadCountForAccountUseCase(messageRepository, getPatientProfileByAccountIdUseCase, getDoctorProfileByAccountIdUseCase),
      inject: [MESSAGE_REPOSITORY, GetPatientProfileByAccountIdUseCase, GetDoctorProfileByAccountIdUseCase],
    },
    {
      provide: ListAppointmentsForThreadUseCase,
      useFactory: (
        threadRepository: MessageThreadRepository,
        getAppointmentsForDoctorAndPatientUseCase: GetAppointmentsForDoctorAndPatientUseCase,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) =>
        new ListAppointmentsForThreadUseCase(
          threadRepository,
          getAppointmentsForDoctorAndPatientUseCase,
          getPatientProfileByAccountIdUseCase,
          getDoctorProfileByAccountIdUseCase,
        ),
      inject: [
        MESSAGE_THREAD_REPOSITORY,
        GetAppointmentsForDoctorAndPatientUseCase,
        GetPatientProfileByAccountIdUseCase,
        GetDoctorProfileByAccountIdUseCase,
      ],
    },
  ],
  exports: [],
})
export class MessagingModule {}

// Re-export note: the controller also directly injects
// GetPatientProfileByIdUseCase, GetDoctorProfileByIdUseCase, and
// GetAccountByIdUseCase (all already provided by PatientModule/DoctorModule/
// IdentityModule respectively, imported above) to resolve
// counterpartyDisplayName -- no additional provider registration is needed
// here since Nest resolves them from the imported modules' own exports.
