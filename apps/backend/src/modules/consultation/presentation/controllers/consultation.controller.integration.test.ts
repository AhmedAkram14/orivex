import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetSchedulingRulesUseCase } from '../../../scheduling/application/use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { ReleaseAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { ReserveAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../doctor/domain/entities/availability-window.entity.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../doctor/domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { ConfirmSlotUseCase } from '../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ReleaseSlotUseCase } from '../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotUseCase } from '../../../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import { APPOINTMENT_REPOSITORY, CONSULTATION_SESSION_REPOSITORY } from '../../application/ports/tokens.js';
import { BookAppointmentUseCase } from '../../application/use-cases/book-appointment/book-appointment.use-case.js';
import { CloseConsultationUseCase } from '../../application/use-cases/close-consultation/close-consultation.use-case.js';
import { ConfirmAppointmentUseCase } from '../../application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../../application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ListAppointmentsForDoctorUseCase } from '../../application/use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';
import { ListAppointmentsForPatientUseCase } from '../../application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { ListAppointmentsForPatientPageUseCase } from '../../application/use-cases/list-appointments-for-patient-page/list-appointments-for-patient-page.use-case.js';
import { MintConsultationRoomTokenUseCase } from '../../application/use-cases/mint-consultation-room-token/mint-consultation-room-token.use-case.js';
import { RescheduleOrCancelAppointmentUseCase } from '../../application/use-cases/reschedule-or-cancel-appointment/reschedule-or-cancel-appointment.use-case.js';
import { StartConsultationUseCase } from '../../application/use-cases/start-consultation/start-consultation.use-case.js';
import { CheckIdentityVerificationStatusUseCase } from '../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import type { IdentityVerificationStatusResult } from '../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VerificationStatus } from '../../../trust/domain/enums/verification-status.enum.js';
import { RequiresIdentityVerificationGuard } from '../../../trust/presentation/guards/requires-identity-verification.guard.js';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';
import { ConsultationCompletionReason } from '../../domain/enums/consultation-completion-reason.enum.js';
import { ConsultationFeedback } from '../../domain/entities/consultation-feedback.entity.js';
import { ConsultationSession } from '../../domain/entities/consultation-session.entity.js';
import type { AppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../domain/repositories/consultation-feedback.repository.js';
import type { ConsultationSessionRepository } from '../../domain/repositories/consultation-session.repository.js';
import { CONSULTATION_FEEDBACK_REPOSITORY } from '../../application/ports/tokens.js';
import { GetDoctorRatingAggregateUseCase } from '../../application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregate.use-case.js';
import { GetDoctorReportsSummaryUseCase } from '../../application/use-cases/get-doctor-reports-summary/get-doctor-reports-summary.use-case.js';
import { ListConsultationFeedbackForDoctorUseCase } from '../../application/use-cases/list-consultation-feedback-for-doctor/list-consultation-feedback-for-doctor.use-case.js';
import { SubmitConsultationFeedbackUseCase } from '../../application/use-cases/submit-consultation-feedback/submit-consultation-feedback.use-case.js';
import { UpdateConsultationFeedbackUseCase } from '../../application/use-cases/update-consultation-feedback/update-consultation-feedback.use-case.js';
import { DeleteConsultationFeedbackUseCase } from '../../application/use-cases/delete-consultation-feedback/delete-consultation-feedback.use-case.js';
import type { RealtimeEmitterPort } from '../../../../platform/realtime/ports/realtime-emitter.port.js';
import type { GenerateRoomTokenRequest, GenerateRoomTokenResult, RoomTokenGeneratorPort } from '../../application/ports/room-token-generator.port.js';
import { ListMedicalSpecialtiesUseCase } from '../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { MedicalSpecialty } from '../../../reference/domain/entities/medical-specialty.entity.js';
import type { MedicalSpecialtyRepository } from '../../../reference/domain/repositories/medical-specialty.repository.js';

import { AppointmentController } from './appointment.controller.js';
import { ConsultationFeedbackController } from './consultation-feedback.controller.js';
import { DoctorAppointmentsController } from './doctor-appointments.controller.js';
import { DoctorReviewsController } from './doctor-reviews.controller.js';
import { ConsultationController } from './consultation.controller.js';

const VALID_PATIENT_TOKEN = 'valid-patient-token';
const VALID_DOCTOR_TOKEN = 'valid-doctor-token';
const VALID_DOCTOR_NO_PROFILE_TOKEN = 'valid-doctor-no-profile-token';
const VALID_PATIENT_NO_PROFILE_TOKEN = 'valid-patient-no-profile-token';
const VALID_UNVERIFIED_PATIENT_TOKEN = 'valid-unverified-patient-token';

// Onboarding Redesign (2026-07-21 proposal, Stage O.4) test double --
// RequiresIdentityVerificationGuard's real dependency, faked here so the
// guard's own real class can run in this suite's TestingModule exactly as it
// would in production, deciding isVerified per-accountId rather than
// stubbing the guard itself out.
class FakeCheckIdentityVerificationStatusUseCase {
  constructor(private readonly verifiedAccountIds: Set<string>) {}
  async execute(query: { subjectAccountId: string }): Promise<IdentityVerificationStatusResult> {
    const isVerified = this.verifiedAccountIds.has(query.subjectAccountId);
    return { status: isVerified ? VerificationStatus.Approved : 'not_submitted', isVerified };
  }
}

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profile.getAccountId() === accountId ? this.profile : null;
  }
  async save(): Promise<void> {}
}

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile) {}
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.profile.getAccountId() === accountId ? this.profile : null;
  }
  async save(): Promise<void> {}
}

class InMemoryMedicalSpecialtyRepository implements MedicalSpecialtyRepository {
  constructor(private readonly specialties: MedicalSpecialty[]) {}
  async findAll(): Promise<MedicalSpecialty[]> {
    return this.specialties;
  }
  async findById(id: string): Promise<MedicalSpecialty | null> {
    return this.specialties.find((specialty) => specialty.getId() === id) ?? null;
  }
  async save(): Promise<void> {}
}

class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly accounts: Account[]) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.accounts.find((account) => account.getId().equals(id)) ?? null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }

  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
  }
  async save(): Promise<void> {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly tokens: Map<string, AccessTokenClaims>) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    const claims = this.tokens.get(token);
    if (!claims) {
      throw new Error('invalid token');
    }
    return claims;
  }
}

class InMemoryAvailabilityWindowRepository implements AvailabilityWindowRepository {
  private readonly byId = new Map<string, AvailabilityWindow>();
  seed(window: AvailabilityWindow): void {
    this.byId.set(window.getId(), window);
  }
  async findById(id: string): Promise<AvailabilityWindow | null> {
    return this.byId.get(id) ?? null;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async findByDoctorAndRange(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(window: AvailabilityWindow): Promise<void> {
    this.byId.set(window.getId(), window);
  }
}

class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly byId = new Map<string, Appointment>();
  async findById(id: string): Promise<Appointment | null> {
    return this.byId.get(id) ?? null;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return Array.from(this.byId.values()).filter((appointment) => appointment.getPatientId() === patientId);
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return Array.from(this.byId.values()).filter((appointment) => appointment.getDoctorId() === doctorId);
  }
  async findByDoctorIdForDateRange(doctorId: string, start: Date, end: Date): Promise<Appointment[]> {
    return (await this.findByDoctorId(doctorId)).filter(
      (appointment) => appointment.getScheduledAt() >= start && appointment.getScheduledAt() < end,
    );
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(doctorId: string): Promise<Partial<Record<string, number>>> {
    const result: Partial<Record<string, number>> = {};
    for (const appointment of await this.findByDoctorId(doctorId)) {
      const status = appointment.getStatus();
      result[status] = (result[status] ?? 0) + 1;
    }
    return result;
  }
  async save(appointment: Appointment): Promise<void> {
    this.byId.set(appointment.getId(), appointment);
  }
}

class InMemoryConsultationSessionRepository implements ConsultationSessionRepository {
  private readonly byId = new Map<string, ConsultationSession>();
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null> {
    for (const session of this.byId.values()) {
      if (session.getAppointmentId() === appointmentId) {
        return session;
      }
    }
    return null;
  }
  async save(session: ConsultationSession): Promise<void> {
    this.byId.set(session.getId(), session);
  }
}

class InMemoryConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  private readonly bySessionId = new Map<string, ConsultationFeedback>();
  async findByConsultationSessionId(consultationSessionId: string): Promise<ConsultationFeedback | null> {
    return this.bySessionId.get(consultationSessionId) ?? null;
  }
  async listForDoctor(doctorId: string): Promise<{ feedback: ConsultationFeedback[]; total: number }> {
    const feedback = Array.from(this.bySessionId.values())
      .filter((item) => item.getDoctorId() === doctorId)
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());
    return { feedback, total: feedback.length };
  }
  async getRatingAggregateForDoctor(doctorId: string): Promise<DoctorRatingAggregate> {
    const { feedback } = await this.listForDoctor(doctorId);
    if (feedback.length === 0) {
      return { averageRating: null, reviewCount: 0 };
    }
    const averageRating = feedback.reduce((sum, item) => sum + item.getRating(), 0) / feedback.length;
    return { averageRating, reviewCount: feedback.length };
  }
  async getRatingAggregatesForDoctors(doctorIds: string[]): Promise<Map<string, DoctorRatingAggregate>> {
    const result = new Map<string, DoctorRatingAggregate>();
    for (const doctorId of doctorIds) {
      result.set(doctorId, await this.getRatingAggregateForDoctor(doctorId));
    }
    return result;
  }
  async save(feedback: ConsultationFeedback): Promise<void> {
    this.bySessionId.set(feedback.getConsultationSessionId(), feedback);
  }
  async update(feedback: ConsultationFeedback): Promise<void> {
    this.bySessionId.set(feedback.getConsultationSessionId(), feedback);
  }
  async delete(id: string): Promise<void> {
    for (const [sessionId, feedback] of this.bySessionId.entries()) {
      if (feedback.getId() === id) {
        this.bySessionId.delete(sessionId);
        return;
      }
    }
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }

  subscribe(): void {}
}

// Test-only fake gateway -- standard test-double practice, not a
// production adapter. ConsultationModule itself registers no provider for
// ROOM_TOKEN_GENERATOR in this test module.
class FakeRoomTokenGenerator implements RoomTokenGeneratorPort {
  public lastRequest: GenerateRoomTokenRequest | undefined;
  async generateToken(request: GenerateRoomTokenRequest): Promise<GenerateRoomTokenResult> {
    this.lastRequest = request;
    return { token: 'fake-jwt-token', url: 'wss://fake.livekit.cloud' };
  }
}

describe('Consultation controllers (integration)', () => {
  let app: INestApplication;
  let patient: PatientProfile;
  let doctor: DoctorProfile;
  let freeWindow: AvailabilityWindow;
  let secondFreeWindow: AvailabilityWindow;
  let paidWindow: AvailabilityWindow;
  let sessionRepo: InMemoryConsultationSessionRepository;
  let appointmentRepo: InMemoryAppointmentRepository;
  let bookedAppointmentId: string;
  let todaysConsultationSessionId: string;
  let completedConsultationSessionId: string;
  let roomTokenGenerator: FakeRoomTokenGenerator;

  before(async () => {
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Amina Youssef'),
    });
    const doctorAccount = Account.register({
      email: EmailAddress.create('doctor@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. Karim Adel'),
    });
    const doctorAccountNoProfile = Account.register({
      email: EmailAddress.create('doctor-no-profile@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. No Profile'),
    });
    const patientAccountNoProfile = Account.register({
      email: EmailAddress.create('patient-no-profile@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('No Profile Patient'),
    });
    const unverifiedPatientAccount = Account.register({
      email: EmailAddress.create('unverified-patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Unverified Patient'),
    });

    patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });
    doctor = DoctorProfile.register({
      accountId: doctorAccount.getId().toString(),
      licenseNumber: 'LIC-1',
      specialtyId: '11111111-1111-4111-8111-111111111111',
      consultationFeeAmount: 500,
    });

    const windowStart = new Date(Date.now() + 60 * 60_000);
    freeWindow = AvailabilityWindow.define({
      doctorId: doctor.getId(),
      startTime: windowStart,
      endTime: new Date(windowStart.getTime() + 30 * 60_000),
      consultationType: DoctorConsultationType.Free,
    });
    secondFreeWindow = AvailabilityWindow.define({
      doctorId: doctor.getId(),
      startTime: new Date(windowStart.getTime() + 60 * 60_000),
      endTime: new Date(windowStart.getTime() + 90 * 60_000),
      consultationType: DoctorConsultationType.Free,
    });
    // Scheduled a full 3 days out, deliberately never "today" -- this
    // suite's doctor-dashboard-summary/upcoming-work/queue tests assert
    // exact counts of today's accumulated appointments, and this fixture
    // must never be silently counted among them.
    paidWindow = AvailabilityWindow.define({
      doctorId: doctor.getId(),
      startTime: new Date(windowStart.getTime() + 72 * 60 * 60_000),
      endTime: new Date(windowStart.getTime() + 72 * 60 * 60_000 + 30 * 60_000),
      consultationType: DoctorConsultationType.Paid,
    });

    const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository();
    availabilityWindowRepo.seed(freeWindow);
    availabilityWindowRepo.seed(secondFreeWindow);
    availabilityWindowRepo.seed(paidWindow);

    appointmentRepo = new InMemoryAppointmentRepository();
    sessionRepo = new InMemoryConsultationSessionRepository();

    // A Confirmed appointment scheduled "now" (guaranteed today), seeded
    // directly rather than through the booking flow -- backs the doctor
    // dashboard-summary/upcoming-work populated-case tests.
    const todaysConfirmedAppointment = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctor.getId(),
      availabilityWindowId: freeWindow.getId(),
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(),
      reasonForVisit: 'Follow-up on medication',
    });
    todaysConfirmedAppointment.confirm();
    await appointmentRepo.save(todaysConfirmedAppointment);
    // A real ConsultationSession, exactly as ConfirmAppointmentUseCase would
    // have opened one -- backs the doctor/queue populated-case test.
    const todaysSession = ConsultationSession.open(todaysConfirmedAppointment.getId());
    await sessionRepo.save(todaysSession);
    todaysConsultationSessionId = todaysSession.getId();

    // Consultation lifecycle completion follow-up (2026-07-26): a genuinely
    // Completed appointment + session, seeded directly (mirrors the
    // todaysConfirmedAppointment precedent above) -- backs the
    // ConsultationFeedbackController tests, which need a session that has
    // actually been closed with reason Completed, not just Confirmed.
    // Deliberately scheduled several days in the past (not "today"), same
    // reasoning as paidWindow's own comment above -- the doctor/dashboard-
    // summary and doctor/queue endpoints are strictly scoped to today's
    // date range, and this fixture must never be silently counted among them.
    const completedAppointment = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctor.getId(),
      availabilityWindowId: freeWindow.getId(),
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() - 72 * 60 * 60_000),
      reasonForVisit: 'Completed consultation fixture',
    });
    completedAppointment.confirm();
    await appointmentRepo.save(completedAppointment);
    const completedSession = ConsultationSession.open(completedAppointment.getId());
    completedSession.start();
    completedSession.close(ConsultationCompletionReason.Completed);
    completedAppointment.complete();
    await appointmentRepo.save(completedAppointment);
    await sessionRepo.save(completedSession);
    completedConsultationSessionId = completedSession.getId();

    const reserveSlotUseCase = new ReserveSlotUseCase(
      new ReserveAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDomainEventDispatcher()),
    );
    const releaseSlotUseCase = new ReleaseSlotUseCase(
      new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDomainEventDispatcher()),
    );
    const confirmSlotUseCase = new ConfirmSlotUseCase(
      new ConfirmAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDomainEventDispatcher()),
    );
    const confirmAppointmentUseCase = new ConfirmAppointmentUseCase(
      appointmentRepo,
      sessionRepo,
      confirmSlotUseCase,
      new NoopDomainEventDispatcher(),
    );
    const bookAppointmentUseCase = new BookAppointmentUseCase(
      appointmentRepo,
      new NoopDomainEventDispatcher(),
      new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(patient)),
      new GetDoctorProfileByIdUseCase(new InMemoryDoctorProfileRepository(doctor)),
      new GetAvailabilityWindowByIdUseCase(availabilityWindowRepo),
      reserveSlotUseCase,
      releaseSlotUseCase,
    );
    const rescheduleOrCancelAppointmentUseCase = new RescheduleOrCancelAppointmentUseCase(
      appointmentRepo,
      new NoopDomainEventDispatcher(),
      new GetAvailabilityWindowByIdUseCase(availabilityWindowRepo),
      reserveSlotUseCase,
      releaseSlotUseCase,
      confirmAppointmentUseCase,
    );
    const startConsultationUseCase = new StartConsultationUseCase(sessionRepo, new NoopDomainEventDispatcher());
    const closeConsultationUseCase = new CloseConsultationUseCase(
      sessionRepo,
      appointmentRepo,
      new NoopDomainEventDispatcher(),
    );
    roomTokenGenerator = new FakeRoomTokenGenerator();
    const mintConsultationRoomTokenUseCase = new MintConsultationRoomTokenUseCase(sessionRepo, roomTokenGenerator);

    const accountRepo = new InMemoryAccountRepository([
      patientAccount,
      doctorAccount,
      doctorAccountNoProfile,
      patientAccountNoProfile,
      unverifiedPatientAccount,
    ]);
    const getAccountByIdUseCase = new GetAccountByIdUseCase(accountRepo);
    const getPatientProfileByAccountIdUseCase = new GetPatientProfileByAccountIdUseCase(
      new InMemoryPatientProfileRepository(patient),
    );
    const getPatientProfileByIdUseCase = new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(patient));
    const getDoctorProfileByIdUseCase = new GetDoctorProfileByIdUseCase(new InMemoryDoctorProfileRepository(doctor));
    const getDoctorProfileByAccountIdUseCase = new GetDoctorProfileByAccountIdUseCase(
      new InMemoryDoctorProfileRepository(doctor),
    );
    const listAppointmentsForPatientUseCase = new ListAppointmentsForPatientUseCase(appointmentRepo);
    const listAppointmentsForPatientPageUseCase = new ListAppointmentsForPatientPageUseCase(appointmentRepo);
    const listAppointmentsForDoctorUseCase = new ListAppointmentsForDoctorUseCase(appointmentRepo);
    const feedbackRepo = new InMemoryConsultationFeedbackRepository();
    const submitConsultationFeedbackUseCase = new SubmitConsultationFeedbackUseCase(
      feedbackRepo,
      sessionRepo,
      appointmentRepo,
      new GetPatientProfileByAccountIdUseCase(new InMemoryPatientProfileRepository(patient)),
      new NoopDomainEventDispatcher(),
    );
    const noopRealtimeEmitter: RealtimeEmitterPort = { emitToAccount: () => {} };
    const updateConsultationFeedbackUseCase = new UpdateConsultationFeedbackUseCase(
      feedbackRepo,
      new GetPatientProfileByAccountIdUseCase(new InMemoryPatientProfileRepository(patient)),
      getDoctorProfileByIdUseCase,
      noopRealtimeEmitter,
    );
    const deleteConsultationFeedbackUseCase = new DeleteConsultationFeedbackUseCase(
      feedbackRepo,
      new GetPatientProfileByAccountIdUseCase(new InMemoryPatientProfileRepository(patient)),
      getDoctorProfileByIdUseCase,
      noopRealtimeEmitter,
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AppointmentController,
        DoctorAppointmentsController,
        ConsultationController,
        ConsultationFeedbackController,
        DoctorReviewsController,
      ],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: JWT_SIGNER,
          useFactory: () =>
            new FakeJwtSigner(
              new Map([
                [VALID_PATIENT_TOKEN, { accountId: patientAccount.getId().toString(), role: AccountRole.Patient }],
                [VALID_DOCTOR_TOKEN, { accountId: doctorAccount.getId().toString(), role: AccountRole.Doctor }],
                [
                  VALID_DOCTOR_NO_PROFILE_TOKEN,
                  { accountId: doctorAccountNoProfile.getId().toString(), role: AccountRole.Doctor },
                ],
                [
                  VALID_PATIENT_NO_PROFILE_TOKEN,
                  { accountId: patientAccountNoProfile.getId().toString(), role: AccountRole.Patient },
                ],
                [
                  VALID_UNVERIFIED_PATIENT_TOKEN,
                  { accountId: unverifiedPatientAccount.getId().toString(), role: AccountRole.Patient },
                ],
              ]),
            ),
        },
        RequiresIdentityVerificationGuard,
        {
          provide: CheckIdentityVerificationStatusUseCase,
          useValue: new FakeCheckIdentityVerificationStatusUseCase(
            new Set([
              patientAccount.getId().toString(),
              doctorAccount.getId().toString(),
              doctorAccountNoProfile.getId().toString(),
              patientAccountNoProfile.getId().toString(),
            ]),
          ),
        },
        { provide: APPOINTMENT_REPOSITORY, useValue: appointmentRepo },
        { provide: CONSULTATION_SESSION_REPOSITORY, useValue: sessionRepo },
        { provide: CONSULTATION_FEEDBACK_REPOSITORY, useValue: feedbackRepo },
        { provide: SubmitConsultationFeedbackUseCase, useValue: submitConsultationFeedbackUseCase },
        { provide: UpdateConsultationFeedbackUseCase, useValue: updateConsultationFeedbackUseCase },
        { provide: DeleteConsultationFeedbackUseCase, useValue: deleteConsultationFeedbackUseCase },
        { provide: GetDoctorRatingAggregateUseCase, useValue: new GetDoctorRatingAggregateUseCase(feedbackRepo) },
        {
          provide: GetDoctorReportsSummaryUseCase,
          useValue: new GetDoctorReportsSummaryUseCase(appointmentRepo, new GetDoctorRatingAggregateUseCase(feedbackRepo)),
        },
        {
          provide: ListConsultationFeedbackForDoctorUseCase,
          useValue: new ListConsultationFeedbackForDoctorUseCase(feedbackRepo),
        },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        { provide: BookAppointmentUseCase, useValue: bookAppointmentUseCase },
        { provide: RescheduleOrCancelAppointmentUseCase, useValue: rescheduleOrCancelAppointmentUseCase },
        { provide: StartConsultationUseCase, useValue: startConsultationUseCase },
        { provide: CloseConsultationUseCase, useValue: closeConsultationUseCase },
        { provide: MintConsultationRoomTokenUseCase, useValue: mintConsultationRoomTokenUseCase },
        { provide: GetAccountByIdUseCase, useValue: getAccountByIdUseCase },
        { provide: GetPatientProfileByAccountIdUseCase, useValue: getPatientProfileByAccountIdUseCase },
        { provide: GetPatientProfileByIdUseCase, useValue: getPatientProfileByIdUseCase },
        { provide: GetDoctorProfileByIdUseCase, useValue: getDoctorProfileByIdUseCase },
        { provide: GetDoctorProfileByAccountIdUseCase, useValue: getDoctorProfileByAccountIdUseCase },
        { provide: ListAppointmentsForPatientUseCase, useValue: listAppointmentsForPatientUseCase },
        { provide: ListAppointmentsForPatientPageUseCase, useValue: listAppointmentsForPatientPageUseCase },
        { provide: ListAppointmentsForDoctorUseCase, useValue: listAppointmentsForDoctorUseCase },
        {
          provide: GetConsultationSessionByAppointmentIdUseCase,
          useValue: new GetConsultationSessionByAppointmentIdUseCase(sessionRepo),
        },
        { provide: GetSchedulingRulesUseCase, useValue: new GetSchedulingRulesUseCase() },
        { provide: GetAppointmentByIdUseCase, useValue: new GetAppointmentByIdUseCase(appointmentRepo) },
        { provide: ConfirmAppointmentUseCase, useValue: confirmAppointmentUseCase },
        { provide: GetConsultationSessionByIdUseCase, useValue: new GetConsultationSessionByIdUseCase(sessionRepo) },
        {
          provide: ListMedicalSpecialtiesUseCase,
          useValue: new ListMedicalSpecialtiesUseCase(
            new InMemoryMedicalSpecialtyRepository([
              MedicalSpecialty.reconstitute({
                id: '11111111-1111-4111-8111-111111111111',
                name: 'Cardiology',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            ]),
          ),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: createValidationException,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('POST /appointments rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        doctorId: doctor.getId(),
        availabilityWindowId: freeWindow.getId(),
        consultationType: 'free',
        reasonForVisit: 'Routine check-up',
      })
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /appointments books a free appointment as Requested, awaiting doctor approval', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .send({
        doctorId: doctor.getId(),
        availabilityWindowId: freeWindow.getId(),
        consultationType: 'free',
        reasonForVisit: 'Routine check-up',
      })
      .expect(201);

    assert.equal(response.body.data.status, 'requested');
    bookedAppointmentId = response.body.data.id;
  });

  // Doctor-approval-workflow fix: the doctor's explicit approval -- every
  // booking (Free or Paid) waits here before it's Confirmed and a
  // ConsultationSession opens, which the rest of this suite's start/close/
  // cancel-terminal chain depends on exactly as it did before this fix
  // (when booking auto-confirmed).
  it('PATCH /appointments/:id/approve confirms the appointment and opens a ConsultationSession', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/appointments/${bookedAppointmentId}/approve`)
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.status, 'confirmed');
    const session = await sessionRepo.findByAppointmentId(bookedAppointmentId);
    assert.ok(session, 'expected a ConsultationSession to be opened on approval');
  });

  it('PATCH /appointments/:id/approve rejects a doctor who does not own the appointment', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/appointments/${bookedAppointmentId}/approve`)
      .set('Authorization', `Bearer ${VALID_DOCTOR_NO_PROFILE_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /appointments rejects a caller with no patient profile with 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${VALID_PATIENT_NO_PROFILE_TOKEN}`)
      .send({
        doctorId: doctor.getId(),
        availabilityWindowId: secondFreeWindow.getId(),
        consultationType: 'free',
      })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /appointments rejects a mismatched consultationType with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .send({
        doctorId: doctor.getId(),
        availabilityWindowId: secondFreeWindow.getId(),
        consultationType: 'paid',
      })
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('POST /appointments rejects rebooking an already-held/booked window with 409', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .send({
        doctorId: doctor.getId(),
        availabilityWindowId: freeWindow.getId(),
        consultationType: 'free',
      })
      .expect(409);

    assert.equal(response.body.error.code, 'CONFLICT');
  });

  // Onboarding Redesign (2026-07-21 proposal, Stage O.4): the security
  // boundary itself -- proves this is a real, direct-API-call-level gate,
  // not merely a frontend concern. VALID_UNVERIFIED_PATIENT_TOKEN has no
  // patient profile seeded at all, yet still gets 403 (not 404), confirming
  // the guard runs and blocks before the handler's own profile/ownership
  // logic is ever reached.
  it('POST /appointments returns 403 IDENTITY_VERIFICATION_REQUIRED for an unverified patient', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${VALID_UNVERIFIED_PATIENT_TOKEN}`)
      .send({
        doctorId: doctor.getId(),
        availabilityWindowId: freeWindow.getId(),
        consultationType: 'free',
        reasonForVisit: 'Routine check-up',
      })
      .expect(403);

    assert.equal(response.body.error.code, 'IDENTITY_VERIFICATION_REQUIRED');
  });

  it('POST /consultations/:id/start rejects a request with no bearer token', async () => {
    const session = await sessionRepo.findByAppointmentId(bookedAppointmentId);
    assert.ok(session);
    const response = await request(app.getHttpServer()).post(`/consultations/${session.getId()}/start`).expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /consultations/:id/start and /close drive the session through its lifecycle', async () => {
    const session = await sessionRepo.findByAppointmentId(bookedAppointmentId);
    assert.ok(session);
    const sessionId = session.getId();

    const startResponse = await request(app.getHttpServer())
      .post(`/consultations/${sessionId}/start`)
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .expect(200);
    assert.equal(startResponse.body.data.state, 'in_progress');

    const closeResponse = await request(app.getHttpServer())
      .post(`/consultations/${sessionId}/close`)
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .send({ completionReason: 'completed' })
      .expect(200);
    assert.equal(closeResponse.body.data.state, 'closed');
  });

  it('POST /consultations/:id/start returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .post('/consultations/99999999-9999-4999-8999-999999999999/start')
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('PATCH /appointments/:id rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/appointments/${bookedAppointmentId}`)
      .send({ action: 'cancel' })
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('PATCH /appointments/:id rejects a caller who does not own the appointment', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/appointments/${bookedAppointmentId}`)
      .set('Authorization', `Bearer ${VALID_DOCTOR_NO_PROFILE_TOKEN}`)
      .send({ action: 'cancel' })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('PATCH /appointments/:id rejects cancelling an already-terminal (Completed) appointment', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/appointments/${bookedAppointmentId}`)
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .send({ action: 'cancel' })
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('PATCH /appointments/:id cancels a Confirmed appointment on the second window', async () => {
    const booked = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .send({
        doctorId: doctor.getId(),
        availabilityWindowId: secondFreeWindow.getId(),
        consultationType: 'free',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/appointments/${booked.body.data.id}`)
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .send({ action: 'cancel' })
      .expect(200);

    assert.equal(response.body.data.status, 'cancelled');
  });

  it('GET /appointments/me rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/appointments/me').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /appointments/me returns the caller\'s own appointments with doctor name/specialty composed in', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/me')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .expect(200);

    assert.ok(response.body.data.length >= 2);
    for (const item of response.body.data) {
      assert.equal(item.doctorName, 'Dr. Karim Adel');
      assert.equal(item.specialization, 'Cardiology');
      assert.ok(item.scheduledAt);
      assert.ok(['requested', 'confirmed', 'rescheduled', 'cancelled', 'no_show', 'completed'].includes(item.status));
    }
    assert.equal(response.body.meta.page, 1);
    assert.equal(response.body.meta.limit, 50);
    assert.ok(response.body.meta.total >= 2);
  });

  it('GET /appointments/me?page=1&limit=1 returns a single page and the true total', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/me?page=1&limit=1')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.meta.page, 1);
    assert.equal(response.body.meta.limit, 1);
    assert.ok(response.body.meta.total >= 2);
  });

  // ORIVEX Roadmap 2.0 Stage 1: GET /appointments/me must surface enough
  // for the frontend to render a real "Pay now" action -- a real
  // ConsultationSession id plus the doctor's real fee, and only while the
  // appointment is genuinely still awaiting payment.
  //
  // TEMPORARY (2026-07-26): BookAppointmentUseCase now auto-confirms Paid
  // bookings too (Stripe isn't wired up in production yet -- see that
  // class's header comment), so a Requested-Paid appointment can no longer
  // be produced through the real booking flow. This still seeds one
  // directly into the repos (exactly as ConfirmAppointmentUseCase/
  // BookAppointmentUseCase used to leave it) to keep proving the list
  // endpoint's own `paymentRequired`/session-id/fee computation is correct
  // for whenever that state becomes reachable again (a real Stripe charge
  // failing partway, or once Stripe booking is properly reintroduced).
  it('GET /appointments/me marks a Paid, unconfirmed appointment as paymentRequired with a real session id and fee', async () => {
    const requestedPaidAppointment = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctor.getId(),
      availabilityWindowId: paidWindow.getId(),
      consultationType: ConsultationType.Paid,
      scheduledAt: paidWindow.getStartTime(),
      reasonForVisit: 'Specialist consultation',
    });
    await appointmentRepo.save(requestedPaidAppointment);
    await sessionRepo.save(ConsultationSession.open(requestedPaidAppointment.getId()));

    const response = await request(app.getHttpServer())
      .get('/appointments/me')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .expect(200);

    const item = response.body.data.find((entry: { id: string }) => entry.id === requestedPaidAppointment.getId());
    assert.ok(item, 'expected the seeded Requested-Paid appointment in the list');
    assert.equal(item.paymentRequired, true);
    assert.ok(item.consultationSessionId, 'expected a real ConsultationSession id to already exist');
    assert.deepEqual(item.feeAmount, { amount: 500, currency: 'EGP' });
  });

  it("GET /appointments/me never marks a Confirmed/Free appointment as paymentRequired", async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/me')
      .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
      .expect(200);

    const freeItems = response.body.data.filter((entry: { consultationType: string }) => entry.consultationType === 'free');
    assert.ok(freeItems.length > 0);
    for (const item of freeItems) {
      assert.equal(item.paymentRequired, false);
      assert.equal(item.feeAmount, null);
    }
  });

  it('GET /appointments/doctor/dashboard-summary rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/appointments/doctor/dashboard-summary').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /appointments/doctor/dashboard-summary returns an honest empty summary for a doctor with no registered profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/dashboard-summary')
      .set('Authorization', `Bearer ${VALID_DOCTOR_NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, { consultationsToday: 0, patientsInQueue: 0, completedToday: 0 });
  });

  it('GET /appointments/doctor/dashboard-summary counts today\'s Confirmed appointment for a registered doctor', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/dashboard-summary')
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .expect(200);

    // The suite's earlier tests already booked/completed/cancelled other
    // appointments against this same doctor, all scheduled "today" -- so
    // this asserts on the full accumulated state rather than assuming this
    // is the doctor's only appointment: exactly one appointment is still
    // Confirmed (our seeded `todaysConfirmedAppointment`) and exactly one
    // reached Completed (the earlier consultation start/close test's booking).
    assert.equal(response.body.data.consultationsToday, 1);
    assert.equal(response.body.data.patientsInQueue, 1);
    assert.equal(response.body.data.completedToday, 1);
  });

  it('GET /appointments/doctor/upcoming-work rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/appointments/doctor/upcoming-work').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /appointments/doctor/upcoming-work returns an honest empty list for a doctor with no registered profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/upcoming-work')
      .set('Authorization', `Bearer ${VALID_DOCTOR_NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, []);
  });

  it('GET /appointments/doctor/upcoming-work composes the patient name/reasonForVisit and maps status for a registered doctor', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/upcoming-work')
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .expect(200);

    assert.ok(response.body.data.length >= 1);
    const entry = response.body.data.find((item: { description?: string }) => item.description === 'Follow-up on medication');
    assert.ok(entry);
    assert.equal(entry.title, 'Amina Youssef');
    assert.equal(entry.status, 'upcoming');
    assert.ok(entry.scheduledAt);
  });

  it('GET /appointments/doctor/queue rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/appointments/doctor/queue').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /appointments/doctor/queue returns an honest empty list for a doctor with no registered profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/queue')
      .set('Authorization', `Bearer ${VALID_DOCTOR_NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, []);
  });

  it('GET /appointments/doctor/queue composes the real patient name and a waiting status from the open session', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/queue')
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .expect(200);

    const entry = response.body.data.find((item: { label: string }) => item.label === 'Amina Youssef');
    assert.ok(entry);
    assert.equal(entry.status, 'waiting');
    assert.ok(entry.position >= 1);
    assert.ok(typeof entry.estimatedWaitMinutes === 'number');
  });

  it('GET /appointments/doctor/patients rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/appointments/doctor/patients').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /appointments/doctor/patients returns an honest empty list for a doctor with no registered profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/patients')
      .set('Authorization', `Bearer ${VALID_DOCTOR_NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, []);
  });

  it('GET /appointments/doctor/patients groups every real appointment into one row per distinct patient, with a real visit count and most recent visit', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/patients')
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .expect(200);

    const entry = response.body.data.find((item: { patientName: string }) => item.patientName === 'Amina Youssef');
    assert.ok(entry);
    // Seeded fixtures: todaysConfirmedAppointment (Confirmed, today) +
    // completedAppointment (Completed, 72h ago) -- same patient, two visits.
    // >= 2, not exactly 2: this file's appointmentRepo/patient/doctor
    // fixtures are shared and accumulate across every earlier test in this
    // suite (booking/confirm/etc.), not just the two seeded directly in
    // beforeEach -- an exact count would be order-dependent and brittle.
    assert.ok(entry.visitCount >= 2, `expected at least 2 real visits, got ${entry.visitCount}`);
    assert.ok(entry.lastVisitAt, 'expected a real lastVisitAt timestamp');
    // Patients page redesign: real Account fields, not fabricated.
    assert.ok(entry.email, 'expected the patient account email to be populated');
  });

  it('GET /appointments/doctor/reports-summary rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/appointments/doctor/reports-summary').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /appointments/doctor/reports-summary returns an honest empty summary for a doctor with no registered profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/reports-summary')
      .set('Authorization', `Bearer ${VALID_DOCTOR_NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, {
      totalAppointments: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      averageRating: null,
      reviewCount: 0,
    });
  });

  it('GET /appointments/doctor/reports-summary counts real appointments by status and an honest "no reviews yet" rating', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments/doctor/reports-summary')
      .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
      .expect(200);

    // >=, not ===, for the same reason as the /doctor/patients test above --
    // shared fixtures accumulate across earlier tests in this suite.
    assert.ok(response.body.data.confirmed >= 1);
    assert.ok(response.body.data.completed >= 1);
    assert.ok(response.body.data.totalAppointments >= response.body.data.confirmed + response.body.data.completed);
    assert.equal(response.body.data.averageRating, null);
    assert.equal(response.body.data.reviewCount, 0);
  });

  describe('POST /consultations/:id/room-token', () => {
    it('rejects a request with no bearer token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/room-token`)
        .expect(401);

      assert.equal(response.body.error.code, 'UNAUTHORIZED');
    });

    it('returns 400 (VALIDATION_FAILED) for a malformed id', async () => {
      const response = await request(app.getHttpServer())
        .post('/consultations/not-a-uuid/room-token')
        .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
        .expect(400);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    });

    it('returns 404 for an unknown consultation session id', async () => {
      const response = await request(app.getHttpServer())
        .post('/consultations/99999999-9999-4999-8999-999999999999/room-token')
        .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
        .expect(404);

      assert.equal(response.body.error.code, 'NOT_FOUND');
    });

    it('lets the treating doctor mint a room token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/room-token`)
        .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
        .send({ displayName: 'Dr. Karim Adel' })
        .expect(200);

      assert.equal(response.body.data.token, 'fake-jwt-token');
      assert.equal(response.body.data.url, 'wss://fake.livekit.cloud');
    });

    it('lets the treated patient mint a room token for the same session', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/room-token`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({})
        .expect(200);

      assert.ok(response.body.data.token);
    });

    it('falls back to a role-based display name when none is supplied', async () => {
      await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/room-token`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({})
        .expect(200);

      assert.equal(roomTokenGenerator.lastRequest?.displayName, 'Patient');
      assert.equal(roomTokenGenerator.lastRequest?.role, 'patient');
      assert.equal(roomTokenGenerator.lastRequest?.roomName, `consultation-${todaysConsultationSessionId}`);
    });

    it('returns 404 (never leaking existence) for a doctor who did not treat this patient', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/room-token`)
        .set('Authorization', `Bearer ${VALID_DOCTOR_NO_PROFILE_TOKEN}`)
        .send({})
        .expect(404);

      assert.equal(response.body.error.code, 'NOT_FOUND');
    });

    it('returns 404 (never leaking existence) for a patient who was not treated in this consultation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/room-token`)
        .set('Authorization', `Bearer ${VALID_PATIENT_NO_PROFILE_TOKEN}`)
        .send({})
        .expect(404);

      assert.equal(response.body.error.code, 'NOT_FOUND');
    });

    // Onboarding Redesign (2026-07-21 proposal, Stage O.4): only a Patient
    // caller is subject to the gate -- a Doctor minting a token for the same
    // shared route is never blocked, even though this same account set has
    // "unverified" callers.
    it('returns 403 IDENTITY_VERIFICATION_REQUIRED for an unverified patient', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/room-token`)
        .set('Authorization', `Bearer ${VALID_UNVERIFIED_PATIENT_TOKEN}`)
        .send({})
        .expect(403);

      assert.equal(response.body.error.code, 'IDENTITY_VERIFICATION_REQUIRED');
    });

    it('never gates a doctor caller, regardless of identity-verification status', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/room-token`)
        .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
        .send({ displayName: 'Dr. Karim Adel' })
        .expect(200);

      assert.ok(response.body.data.token);
    });
  });

  // Consultation lifecycle completion follow-up (2026-07-26).
  describe('POST /consultations/:id/feedback', () => {
    it('rejects a request with no bearer token', async () => {
      await request(app.getHttpServer())
        .post(`/consultations/${completedConsultationSessionId}/feedback`)
        .send({ rating: 5 })
        .expect(401);
    });

    it('rejects a rating out of range', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({ rating: 6 })
        .expect(400);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    });

    it('rejects reviewing a consultation that has not been completed yet', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${todaysConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({ rating: 5 })
        .expect(422);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    });

    it('rejects a caller with no patient profile', async () => {
      await request(app.getHttpServer())
        .post(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_NO_PROFILE_TOKEN}`)
        .send({ rating: 5 })
        .expect(403);
    });

    it('submits feedback for a genuinely completed consultation, then rejects a duplicate', async () => {
      const response = await request(app.getHttpServer())
        .post(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({ rating: 5, comment: 'Excellent, thorough, and kind.' })
        .expect(201);

      assert.equal(response.body.data.rating, 5);
      assert.equal(response.body.data.comment, 'Excellent, thorough, and kind.');
      assert.equal(response.body.data.consultationSessionId, completedConsultationSessionId);

      const duplicate = await request(app.getHttpServer())
        .post(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({ rating: 3 })
        .expect(409);

      assert.equal(duplicate.body.error.code, 'CONFLICT');
    });

    it('rejects a doctor caller (patient-only route)', async () => {
      await request(app.getHttpServer())
        .post(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
        .send({ rating: 5 })
        .expect(403);
    });
  });

  // Follow-up (2026-07-29): review edit/delete. Runs against the exact
  // feedback row the block above just created, and ends by restoring its
  // original rating/comment so the "GET /doctors/:id/reviews" block below
  // (which asserts on that same row) keeps seeing the values it expects.
  describe('PATCH & DELETE /consultations/:id/feedback', () => {
    it('rejects a PATCH with no bearer token', async () => {
      await request(app.getHttpServer())
        .patch(`/consultations/${completedConsultationSessionId}/feedback`)
        .send({ rating: 4 })
        .expect(401);
    });

    it('rejects a PATCH with an out-of-range rating', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({ rating: 6 })
        .expect(400);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    });

    it('rejects a PATCH from a caller with no patient profile', async () => {
      await request(app.getHttpServer())
        .patch(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_NO_PROFILE_TOKEN}`)
        .send({ rating: 4 })
        .expect(403);
    });

    it('rejects a doctor caller (patient-only route)', async () => {
      await request(app.getHttpServer())
        .patch(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_DOCTOR_TOKEN}`)
        .send({ rating: 4 })
        .expect(403);
    });

    it('updates the rating and comment of an existing review', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({ rating: 2, comment: 'Actually, the follow-up was disappointing.' })
        .expect(200);

      assert.equal(response.body.data.rating, 2);
      assert.equal(response.body.data.comment, 'Actually, the follow-up was disappointing.');

      // Restore the original values so later assertions on this same review
      // (the "GET /doctors/:id/reviews" block) see what they expect.
      await request(app.getHttpServer())
        .patch(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({ rating: 5, comment: 'Excellent, thorough, and kind.' })
        .expect(200);
    });

    it('rejects a DELETE with no bearer token', async () => {
      await request(app.getHttpServer()).delete(`/consultations/${completedConsultationSessionId}/feedback`).expect(401);
    });

    it('rejects a DELETE from a caller with no patient profile', async () => {
      await request(app.getHttpServer())
        .delete(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_NO_PROFILE_TOKEN}`)
        .expect(403);
    });

    it('deletes the review, then lets the same patient submit a fresh one (frees the one-per-session constraint)', async () => {
      await request(app.getHttpServer())
        .delete(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .expect(204);

      // Re-submit the original values so later assertions on this same
      // consultation session (the "GET /doctors/:id/reviews" block) see the
      // exact review they expect, just with a fresh id.
      const response = await request(app.getHttpServer())
        .post(`/consultations/${completedConsultationSessionId}/feedback`)
        .set('Authorization', `Bearer ${VALID_PATIENT_TOKEN}`)
        .send({ rating: 5, comment: 'Excellent, thorough, and kind.' })
        .expect(201);

      assert.equal(response.body.data.rating, 5);
      assert.equal(response.body.data.comment, 'Excellent, thorough, and kind.');
    });
  });

  // Consultation lifecycle completion follow-up (2026-07-26): confirms the
  // real fix for the circular-module-dependency mistake -- this endpoint
  // lives in ConsultationModule (DoctorReviewsController), not DoctorModule,
  // and is reachable with no bearer token at all (public, same as
  // GET /doctors/:id). Runs after the feedback describe block above (node:test
  // preserves file order), so by this point exactly one review already
  // exists for `doctor` (rating 5, from "submits feedback..." there) --
  // asserted against directly rather than re-submitting (which the one-
  // review-per-session rule would correctly reject as a duplicate).
  describe('GET /doctors/:id/reviews', () => {
    it('returns 404 for an unknown doctor id', async () => {
      await request(app.getHttpServer()).get('/doctors/99999999-9999-4999-8999-999999999999/reviews').expect(404);
    });

    it('is reachable with no bearer token and reflects the real submitted review in both the list and the aggregate', async () => {
      const response = await request(app.getHttpServer()).get(`/doctors/${doctor.getId()}/reviews`).expect(200);

      assert.equal(response.body.data.reviews.length, 1);
      assert.equal(response.body.data.reviews[0].rating, 5);
      assert.equal(response.body.data.reviews[0].comment, 'Excellent, thorough, and kind.');
      assert.equal(response.body.data.reviewCount, 1);
      assert.equal(response.body.data.averageRating, 5);
    });
  });
});
