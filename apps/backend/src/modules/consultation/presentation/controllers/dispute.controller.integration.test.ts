import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { ObjectStoragePort } from '../../../asset/application/ports/object-storage.port.js';
import { GetMediaAssetUseCase } from '../../../asset/application/use-cases/get-media-asset/get-media-asset.use-case.js';
import type { MediaAsset } from '../../../asset/domain/entities/media-asset.entity.js';
import type { MediaAssetRepository } from '../../../asset/domain/repositories/media-asset.repository.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../../../shared/domain/domain-event-dispatcher.js';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { Dispute } from '../../domain/entities/dispute.entity.js';
import { DisputeCategory } from '../../domain/enums/dispute-category.enum.js';
import type { AppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { DisputeRepository } from '../../domain/repositories/dispute.repository.js';
import { ConsultationPricing } from '../../domain/value-objects/consultation-pricing.value-object.js';
import { AppointmentPartyResolver } from '../../application/services/appointment-party-resolver.service.js';
import { GetAppointmentByIdUseCase } from '../../application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetDisputeByIdUseCase } from '../../application/use-cases/get-dispute-by-id/get-dispute-by-id.use-case.js';
import { ListDisputesForCallerUseCase } from '../../application/use-cases/list-disputes-for-caller/list-disputes-for-caller.use-case.js';
import { RaiseDisputeUseCase } from '../../application/use-cases/raise-dispute/raise-dispute.use-case.js';
import { WithdrawDisputeUseCase } from '../../application/use-cases/withdraw-dispute/withdraw-dispute.use-case.js';

import { DisputeController } from './dispute.controller.js';

const PATIENT_TOKEN = 'valid-patient-token';
const DOCTOR_TOKEN = 'valid-doctor-token';
const STRANGER_TOKEN = 'valid-stranger-token';

const PATIENT_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const STRANGER_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const PATIENT_PROFILE_ID = '44444444-4444-4444-8444-444444444444';
const DOCTOR_PROFILE_ID = '55555555-5555-4555-8555-555555555555';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === PATIENT_TOKEN) {
      return { accountId: PATIENT_ACCOUNT_ID, role: AccountRole.Patient };
    }
    if (token === DOCTOR_TOKEN) {
      return { accountId: DOCTOR_ACCOUNT_ID, role: AccountRole.Doctor };
    }
    if (token === STRANGER_TOKEN) {
      return { accountId: STRANGER_ACCOUNT_ID, role: AccountRole.Patient };
    }
    throw new Error('invalid token');
  }
}

class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly byId = new Map<string, Appointment>();
  seed(appointment: Appointment): void {
    this.byId.set(appointment.getId(), appointment);
  }
  async findById(id: string): Promise<Appointment | null> {
    return this.byId.get(id) ?? null;
  }
  async findByPatientId(): Promise<Appointment[]> {
    return [];
  }
  async findByPatientIdPage(): Promise<Appointment[]> {
    return [];
  }
  async countByPatientId(): Promise<number> {
    return 0;
  }
  async findByDoctorId(): Promise<Appointment[]> {
    return [];
  }
  async findByPatientAndDoctor(): Promise<Appointment | null> {
    return null;
  }
  async findByDoctorIdForDateRange(): Promise<Appointment[]> {
    return [];
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async countByStatusForDoctorInRange(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async countFreeRequestedForDoctorInRange(): Promise<number> {
    return 0;
  }
  async countByDoctorIdBucketed(): Promise<{ bucket: string; count: number }[]> {
    return [];
  }
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async findRequestedPastScheduledAt(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
  }
  async save(appointment: Appointment): Promise<void> {
    this.byId.set(appointment.getId(), appointment);
  }
}

class InMemoryDisputeRepository implements DisputeRepository {
  private readonly byId = new Map<string, Dispute>();
  seed(dispute: Dispute): void {
    this.byId.set(dispute.getId(), dispute);
  }
  async findById(id: string): Promise<Dispute | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAppointmentId(appointmentId: string): Promise<Dispute | null> {
    return [...this.byId.values()].find((d) => d.getAppointmentId() === appointmentId) ?? null;
  }
  async listForParty(): Promise<Dispute[]> {
    return [];
  }
  async listByStatus(): Promise<{ disputes: Dispute[]; total: number }> {
    return { disputes: [], total: 0 };
  }
  async save(dispute: Dispute): Promise<void> {
    this.byId.set(dispute.getId(), dispute);
  }
  async update(dispute: Dispute): Promise<void> {
    this.byId.set(dispute.getId(), dispute);
  }
}

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly byAccountId: Map<string, PatientProfile>) {}
  async findById(): Promise<PatientProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.byAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly byAccountId: Map<string, DoctorProfile>) {}
  async findById(): Promise<DoctorProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.byAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class EmptyMediaAssetRepository implements MediaAssetRepository {
  async findById(): Promise<MediaAsset | null> {
    return null;
  }
  async findByOwner(): Promise<MediaAsset[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class NoopObjectStorage implements ObjectStoragePort {
  async createPresignedUploadUrl(): Promise<string> {
    return 'https://example.test/upload';
  }
  async createPresignedDownloadUrl(): Promise<string> {
    return 'https://example.test/download';
  }
  async checkConnectivity(): Promise<void> {}
}

class NoopDomainEventDispatcher implements DomainEventDispatcher {
  async dispatch(_events: DomainEvent[]): Promise<void> {}
  subscribe(): void {}
}

describe('DisputeController (integration)', () => {
  let app: INestApplication;
  let appointmentRepository: InMemoryAppointmentRepository;
  let disputeRepository: InMemoryDisputeRepository;
  let sharedAppointment: Appointment;

  before(async () => {
    appointmentRepository = new InMemoryAppointmentRepository();
    disputeRepository = new InMemoryDisputeRepository();

    sharedAppointment = Appointment.request({
      patientId: PATIENT_PROFILE_ID,
      doctorId: DOCTOR_PROFILE_ID,
      availabilityWindowId: '66666666-6666-4666-8666-666666666666',
      pricing: ConsultationPricing.free(),
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    appointmentRepository.seed(sharedAppointment);

    const patientProfiles = new Map<string, PatientProfile>([
      [PATIENT_ACCOUNT_ID, { getId: () => PATIENT_PROFILE_ID } as PatientProfile],
    ]);
    const doctorProfiles = new Map<string, DoctorProfile>([
      [DOCTOR_ACCOUNT_ID, { getId: () => DOCTOR_PROFILE_ID } as DoctorProfile],
    ]);

    const getPatientProfileByAccountIdUseCase = new GetPatientProfileByAccountIdUseCase(
      new InMemoryPatientProfileRepository(patientProfiles),
    );
    const getDoctorProfileByAccountIdUseCase = new GetDoctorProfileByAccountIdUseCase(
      new InMemoryDoctorProfileRepository(doctorProfiles),
    );
    const appointmentPartyResolver = new AppointmentPartyResolver(
      getPatientProfileByAccountIdUseCase,
      getDoctorProfileByAccountIdUseCase,
    );
    const getMediaAssetUseCase = new GetMediaAssetUseCase(new EmptyMediaAssetRepository(), new NoopObjectStorage());
    const dispatcher = new NoopDomainEventDispatcher();

    const raiseDisputeUseCase = new RaiseDisputeUseCase(
      disputeRepository,
      appointmentRepository,
      appointmentPartyResolver,
      getMediaAssetUseCase,
      dispatcher,
    );
    const listDisputesForCallerUseCase = new ListDisputesForCallerUseCase(disputeRepository);
    const getDisputeByIdUseCase = new GetDisputeByIdUseCase(disputeRepository);
    const getAppointmentByIdUseCase = new GetAppointmentByIdUseCase(appointmentRepository);
    const withdrawDisputeUseCase = new WithdrawDisputeUseCase(disputeRepository, dispatcher);

    const moduleRef = await Test.createTestingModule({
      controllers: [DisputeController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        { provide: RaiseDisputeUseCase, useValue: raiseDisputeUseCase },
        { provide: ListDisputesForCallerUseCase, useValue: listDisputesForCallerUseCase },
        { provide: GetDisputeByIdUseCase, useValue: getDisputeByIdUseCase },
        { provide: GetAppointmentByIdUseCase, useValue: getAppointmentByIdUseCase },
        { provide: AppointmentPartyResolver, useValue: appointmentPartyResolver },
        { provide: WithdrawDisputeUseCase, useValue: withdrawDisputeUseCase },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: createValidationException }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('GET /disputes/:id returns the dispute to the raiser', async () => {
    const dispute = Dispute.raise({
      appointmentId: sharedAppointment.getId(),
      raisedByAccountId: PATIENT_ACCOUNT_ID,
      reason: 'Doctor no-show.',
      category: DisputeCategory.NoShow,
    });
    disputeRepository.seed(dispute);

    const response = await request(app.getHttpServer())
      .get(`/disputes/${dispute.getId()}`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.id, dispute.getId());
    assert.equal(response.body.data.category, 'no_show');
  });

  it('GET /disputes/:id returns the dispute to the non-raising counterparty (widened visibility)', async () => {
    const dispute = Dispute.raise({
      appointmentId: sharedAppointment.getId(),
      raisedByAccountId: PATIENT_ACCOUNT_ID,
      reason: 'Doctor no-show.',
      category: DisputeCategory.NoShow,
    });
    disputeRepository.seed(dispute);

    const response = await request(app.getHttpServer())
      .get(`/disputes/${dispute.getId()}`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.id, dispute.getId());
  });

  it('GET /disputes/:id returns 404 for a genuine stranger to the appointment', async () => {
    const dispute = Dispute.raise({
      appointmentId: sharedAppointment.getId(),
      raisedByAccountId: PATIENT_ACCOUNT_ID,
      reason: 'Doctor no-show.',
      category: DisputeCategory.NoShow,
    });
    disputeRepository.seed(dispute);

    const response = await request(app.getHttpServer())
      .get(`/disputes/${dispute.getId()}`)
      .set('Authorization', `Bearer ${STRANGER_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('PATCH /disputes/:id/withdraw lets the raiser withdraw their own Open dispute', async () => {
    const dispute = Dispute.raise({
      appointmentId: sharedAppointment.getId(),
      raisedByAccountId: PATIENT_ACCOUNT_ID,
      reason: 'Doctor no-show.',
      category: DisputeCategory.NoShow,
    });
    disputeRepository.seed(dispute);

    const response = await request(app.getHttpServer())
      .patch(`/disputes/${dispute.getId()}/withdraw`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.status, 'withdrawn');
  });

  it('PATCH /disputes/:id/withdraw returns 404 (not 403) for a caller who did not raise it', async () => {
    const dispute = Dispute.raise({
      appointmentId: sharedAppointment.getId(),
      raisedByAccountId: PATIENT_ACCOUNT_ID,
      reason: 'Doctor no-show.',
      category: DisputeCategory.NoShow,
    });
    disputeRepository.seed(dispute);

    const response = await request(app.getHttpServer())
      .patch(`/disputes/${dispute.getId()}/withdraw`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('rejects an unauthenticated caller', async () => {
    await request(app.getHttpServer()).get('/disputes').expect(401);
  });
});
