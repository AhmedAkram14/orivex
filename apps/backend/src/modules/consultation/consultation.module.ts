import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../core/configuration/env.schema.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { GetAvailabilityWindowByIdUseCase } from '../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { ConfirmSlotUseCase } from '../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ReleaseSlotUseCase } from '../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotUseCase } from '../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { TrustGuardsModule } from '../trust/trust-guards.module.js';

import type { RoomTokenGeneratorPort } from './application/ports/room-token-generator.port.js';
import { APPOINTMENT_REPOSITORY, CONSULTATION_SESSION_REPOSITORY, ROOM_TOKEN_GENERATOR } from './application/ports/tokens.js';
import { BookAppointmentUseCase } from './application/use-cases/book-appointment/book-appointment.use-case.js';
import { CloseConsultationUseCase } from './application/use-cases/close-consultation/close-consultation.use-case.js';
import { ConfirmAppointmentUseCase } from './application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from './application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByAppointmentIdUseCase } from './application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from './application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ListAppointmentsForDoctorUseCase } from './application/use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';
import { ListAppointmentsForPatientUseCase } from './application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { ListAppointmentsForPatientPageUseCase } from './application/use-cases/list-appointments-for-patient-page/list-appointments-for-patient-page.use-case.js';
import { MintConsultationRoomTokenUseCase } from './application/use-cases/mint-consultation-room-token/mint-consultation-room-token.use-case.js';
import { RecordSessionConnectionLogUseCase } from './application/use-cases/record-session-connection-log/record-session-connection-log.use-case.js';
import { RescheduleOrCancelAppointmentUseCase } from './application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { StartConsultationUseCase } from './application/use-cases/start-consultation/start-consultation.use-case.js';
import type { AppointmentRepository } from './domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from './domain/repositories/consultation-session.repository.js';
import { PrismaAppointmentRepository } from './infrastructure/prisma/prisma-appointment.repository.js';
import { PrismaConsultationSessionRepository } from './infrastructure/prisma/prisma-consultation-session.repository.js';
import { NotConfiguredRoomTokenAdapter } from './infrastructure/livekit/not-configured-room-token.adapter.js';
import { LiveKitRoomTokenAdapter } from './infrastructure/livekit/livekit-room-token.adapter.js';
import { AppointmentController } from './presentation/controllers/appointment.controller.js';
import { DoctorAppointmentsController } from './presentation/controllers/doctor-appointments.controller.js';
import { ConsultationController } from './presentation/controllers/consultation.controller.js';
import { TelemedicineWebhookController } from './presentation/controllers/telemedicine-webhook.controller.js';

// Imports PatientModule, DoctorModule, SchedulingModule, IdentityModule, and
// AuthenticationModule to consume their own exported use cases/guards
// (module-to-module calls only through a published interface, never another
// module's repository — docs/10-backend-architecture.md Section 11). None of
// those modules import Consultation back -- no circular imports, no
// forwardRef().
@Module({
  imports: [PatientModule, DoctorModule, SchedulingModule, IdentityModule, AuthenticationModule, TrustGuardsModule],
  controllers: [AppointmentController, DoctorAppointmentsController, ConsultationController, TelemedicineWebhookController],
  providers: [
    { provide: APPOINTMENT_REPOSITORY, useClass: PrismaAppointmentRepository },
    { provide: CONSULTATION_SESSION_REPOSITORY, useClass: PrismaConsultationSessionRepository },
    {
      provide: ConfirmAppointmentUseCase,
      useFactory: (
        appointmentRepository: AppointmentRepository,
        consultationSessionRepository: ConsultationSessionRepository,
        confirmSlotUseCase: ConfirmSlotUseCase,
        eventDispatcher: DomainEventDispatcher,
      ) => new ConfirmAppointmentUseCase(appointmentRepository, consultationSessionRepository, confirmSlotUseCase, eventDispatcher),
      inject: [APPOINTMENT_REPOSITORY, CONSULTATION_SESSION_REPOSITORY, ConfirmSlotUseCase, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: BookAppointmentUseCase,
      useFactory: (
        appointmentRepository: AppointmentRepository,
        consultationSessionRepository: ConsultationSessionRepository,
        eventDispatcher: DomainEventDispatcher,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        getAvailabilityWindowByIdUseCase: GetAvailabilityWindowByIdUseCase,
        reserveSlotUseCase: ReserveSlotUseCase,
        releaseSlotUseCase: ReleaseSlotUseCase,
        confirmAppointmentUseCase: ConfirmAppointmentUseCase,
      ) =>
        new BookAppointmentUseCase(
          appointmentRepository,
          consultationSessionRepository,
          eventDispatcher,
          getPatientProfileByIdUseCase,
          getDoctorProfileByIdUseCase,
          getAvailabilityWindowByIdUseCase,
          reserveSlotUseCase,
          releaseSlotUseCase,
          confirmAppointmentUseCase,
        ),
      inject: [
        APPOINTMENT_REPOSITORY,
        CONSULTATION_SESSION_REPOSITORY,
        DOMAIN_EVENT_DISPATCHER,
        GetPatientProfileByIdUseCase,
        GetDoctorProfileByIdUseCase,
        GetAvailabilityWindowByIdUseCase,
        ReserveSlotUseCase,
        ReleaseSlotUseCase,
        ConfirmAppointmentUseCase,
      ],
    },
    {
      provide: RescheduleOrCancelAppointmentUseCase,
      useFactory: (
        appointmentRepository: AppointmentRepository,
        eventDispatcher: DomainEventDispatcher,
        getAvailabilityWindowByIdUseCase: GetAvailabilityWindowByIdUseCase,
        reserveSlotUseCase: ReserveSlotUseCase,
        releaseSlotUseCase: ReleaseSlotUseCase,
        confirmAppointmentUseCase: ConfirmAppointmentUseCase,
      ) =>
        new RescheduleOrCancelAppointmentUseCase(
          appointmentRepository,
          eventDispatcher,
          getAvailabilityWindowByIdUseCase,
          reserveSlotUseCase,
          releaseSlotUseCase,
          confirmAppointmentUseCase,
        ),
      inject: [
        APPOINTMENT_REPOSITORY,
        DOMAIN_EVENT_DISPATCHER,
        GetAvailabilityWindowByIdUseCase,
        ReserveSlotUseCase,
        ReleaseSlotUseCase,
        ConfirmAppointmentUseCase,
      ],
    },
    {
      provide: GetAppointmentByIdUseCase,
      useFactory: (repository: AppointmentRepository) => new GetAppointmentByIdUseCase(repository),
      inject: [APPOINTMENT_REPOSITORY],
    },
    {
      provide: ListAppointmentsForPatientUseCase,
      useFactory: (repository: AppointmentRepository) => new ListAppointmentsForPatientUseCase(repository),
      inject: [APPOINTMENT_REPOSITORY],
    },
    {
      provide: ListAppointmentsForPatientPageUseCase,
      useFactory: (repository: AppointmentRepository) => new ListAppointmentsForPatientPageUseCase(repository),
      inject: [APPOINTMENT_REPOSITORY],
    },
    {
      provide: ListAppointmentsForDoctorUseCase,
      useFactory: (repository: AppointmentRepository) => new ListAppointmentsForDoctorUseCase(repository),
      inject: [APPOINTMENT_REPOSITORY],
    },
    {
      provide: GetConsultationSessionByIdUseCase,
      useFactory: (repository: ConsultationSessionRepository) => new GetConsultationSessionByIdUseCase(repository),
      inject: [CONSULTATION_SESSION_REPOSITORY],
    },
    {
      provide: GetConsultationSessionByAppointmentIdUseCase,
      useFactory: (repository: ConsultationSessionRepository) => new GetConsultationSessionByAppointmentIdUseCase(repository),
      inject: [CONSULTATION_SESSION_REPOSITORY],
    },
    {
      provide: StartConsultationUseCase,
      useFactory: (repository: ConsultationSessionRepository, eventDispatcher: DomainEventDispatcher) =>
        new StartConsultationUseCase(repository, eventDispatcher),
      inject: [CONSULTATION_SESSION_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: CloseConsultationUseCase,
      useFactory: (
        sessionRepository: ConsultationSessionRepository,
        appointmentRepository: AppointmentRepository,
        eventDispatcher: DomainEventDispatcher,
      ) => new CloseConsultationUseCase(sessionRepository, appointmentRepository, eventDispatcher),
      inject: [CONSULTATION_SESSION_REPOSITORY, APPOINTMENT_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: ROOM_TOKEN_GENERATOR,
      useFactory: (configService: ConfigService<EnvConfig, true>): RoomTokenGeneratorPort => {
        const apiKey = configService.get('LIVEKIT_API_KEY', { infer: true });
        const apiSecret = configService.get('LIVEKIT_API_SECRET', { infer: true });
        const url = configService.get('LIVEKIT_URL', { infer: true });
        return apiKey && apiSecret && url
          ? new LiveKitRoomTokenAdapter(apiKey, apiSecret, url)
          : new NotConfiguredRoomTokenAdapter();
      },
      inject: [ConfigService],
    },
    {
      provide: MintConsultationRoomTokenUseCase,
      useFactory: (repository: ConsultationSessionRepository, roomTokenGenerator: RoomTokenGeneratorPort) =>
        new MintConsultationRoomTokenUseCase(repository, roomTokenGenerator),
      inject: [CONSULTATION_SESSION_REPOSITORY, ROOM_TOKEN_GENERATOR],
    },
    {
      provide: RecordSessionConnectionLogUseCase,
      useFactory: (repository: ConsultationSessionRepository) => new RecordSessionConnectionLogUseCase(repository),
      inject: [CONSULTATION_SESSION_REPOSITORY],
    },
  ],
  exports: [
    BookAppointmentUseCase,
    RescheduleOrCancelAppointmentUseCase,
    ConfirmAppointmentUseCase,
    GetAppointmentByIdUseCase,
    ListAppointmentsForPatientUseCase,
    ListAppointmentsForPatientPageUseCase,
    GetConsultationSessionByIdUseCase,
    GetConsultationSessionByAppointmentIdUseCase,
    StartConsultationUseCase,
    CloseConsultationUseCase,
  ],
})
export class ConsultationModule {}
