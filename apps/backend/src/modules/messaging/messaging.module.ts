import { Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetDoctorProfileByAccountIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { GetPatientProfileByAccountIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';

import { MESSAGE_REPOSITORY, MESSAGE_THREAD_REPOSITORY } from './application/ports/tokens.js';
import { GetMessageThreadByIdUseCase } from './application/use-cases/get-message-thread-by-id/get-message-thread-by-id.use-case.js';
import { ListMessageThreadsForAccountUseCase } from './application/use-cases/list-message-threads-for-account/list-message-threads-for-account.use-case.js';
import { ListMessagesForThreadUseCase } from './application/use-cases/list-messages-for-thread/list-messages-for-thread.use-case.js';
import { MarkThreadMessagesReadUseCase } from './application/use-cases/mark-thread-messages-read/mark-thread-messages-read.use-case.js';
import { SendMessageUseCase } from './application/use-cases/send-message/send-message.use-case.js';
import { StartOrGetMessageThreadUseCase } from './application/use-cases/start-or-get-message-thread/start-or-get-message-thread.use-case.js';
import type { MessageRepository } from './domain/repositories/message.repository.js';
import type { MessageThreadRepository } from './domain/repositories/message-thread.repository.js';
import { PrismaMessageRepository } from './infrastructure/prisma/prisma-message.repository.js';
import { PrismaMessageThreadRepository } from './infrastructure/prisma/prisma-message-thread.repository.js';
import { MessageThreadController } from './presentation/controllers/message-thread.controller.js';

// I7 -- Messaging (docs/01-prd.md §2.13). Imports ConsultationModule (the
// Appointment relationship a thread is anchored to), DoctorModule, and
// PatientModule (resolving a caller's own account id to their profile id)
// only to consume their own exported use cases (module-to-module calls only
// through a published interface, never another module's repository --
// docs/10-backend-architecture.md Section 11). None of those modules import
// MessagingModule back -- no circular imports, no forwardRef().
@Module({
  imports: [ConsultationModule, DoctorModule, PatientModule, AuthenticationGuardsModule],
  controllers: [MessageThreadController],
  providers: [
    { provide: MESSAGE_THREAD_REPOSITORY, useClass: PrismaMessageThreadRepository },
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
    {
      provide: StartOrGetMessageThreadUseCase,
      useFactory: (
        threadRepository: MessageThreadRepository,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) =>
        new StartOrGetMessageThreadUseCase(
          threadRepository,
          getAppointmentByIdUseCase,
          getPatientProfileByAccountIdUseCase,
          getDoctorProfileByAccountIdUseCase,
        ),
      inject: [MESSAGE_THREAD_REPOSITORY, GetAppointmentByIdUseCase, GetPatientProfileByAccountIdUseCase, GetDoctorProfileByAccountIdUseCase],
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
  ],
  exports: [],
})
export class MessagingModule {}
