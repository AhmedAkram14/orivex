import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { GetAvailabilityWindowByIdUseCase } from '../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { ConfirmSlotUseCase } from '../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ReleaseSlotUseCase } from '../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotUseCase } from '../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import { SchedulingModule } from '../scheduling/scheduling.module.js';

import { APPOINTMENT_REPOSITORY, CONSULTATION_SESSION_REPOSITORY } from './application/ports/tokens.js';
import { BookAppointmentUseCase } from './application/use-cases/book-appointment/book-appointment.use-case.js';
import { CloseConsultationUseCase } from './application/use-cases/close-consultation/close-consultation.use-case.js';
import { ConfirmAppointmentUseCase } from './application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from './application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from './application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { RescheduleOrCancelAppointmentUseCase } from './application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { StartConsultationUseCase } from './application/use-cases/start-consultation/start-consultation.use-case.js';
import type { AppointmentRepository } from './domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from './domain/repositories/consultation-session.repository.js';
import { PrismaAppointmentRepository } from './infrastructure/prisma/prisma-appointment.repository.js';
import { PrismaConsultationSessionRepository } from './infrastructure/prisma/prisma-consultation-session.repository.js';
import { AppointmentController } from './presentation/controllers/appointment.controller.js';
import { ConsultationController } from './presentation/controllers/consultation.controller.js';

// Imports PatientModule, DoctorModule, and SchedulingModule to consume their
// own exported use cases (module-to-module calls only through a published
// interface, never another module's repository — docs/10-backend-
// architecture.md Section 11). None of those modules import Consultation
// back -- no circular imports, no forwardRef().
@Module({
  imports: [PatientModule, DoctorModule, SchedulingModule],
  controllers: [AppointmentController, ConsultationController],
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
        eventDispatcher: DomainEventDispatcher,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        getAvailabilityWindowByIdUseCase: GetAvailabilityWindowByIdUseCase,
        reserveSlotUseCase: ReserveSlotUseCase,
        confirmAppointmentUseCase: ConfirmAppointmentUseCase,
      ) =>
        new BookAppointmentUseCase(
          appointmentRepository,
          eventDispatcher,
          getPatientProfileByIdUseCase,
          getDoctorProfileByIdUseCase,
          getAvailabilityWindowByIdUseCase,
          reserveSlotUseCase,
          confirmAppointmentUseCase,
        ),
      inject: [
        APPOINTMENT_REPOSITORY,
        DOMAIN_EVENT_DISPATCHER,
        GetPatientProfileByIdUseCase,
        GetDoctorProfileByIdUseCase,
        GetAvailabilityWindowByIdUseCase,
        ReserveSlotUseCase,
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
      provide: GetConsultationSessionByIdUseCase,
      useFactory: (repository: ConsultationSessionRepository) => new GetConsultationSessionByIdUseCase(repository),
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
  ],
  exports: [
    BookAppointmentUseCase,
    RescheduleOrCancelAppointmentUseCase,
    ConfirmAppointmentUseCase,
    GetAppointmentByIdUseCase,
    GetConsultationSessionByIdUseCase,
    StartConsultationUseCase,
    CloseConsultationUseCase,
  ],
})
export class ConsultationModule {}
