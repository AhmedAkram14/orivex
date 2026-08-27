import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { ListMediaAssetsForOwnerUseCase } from '../../../asset/application/use-cases/list-media-assets-for-owner/list-media-assets-for-owner.use-case.js';
import type { ObjectStoragePort } from '../../../asset/application/ports/object-storage.port.js';
import { MediaAsset } from '../../../asset/domain/entities/media-asset.entity.js';
import { MediaAssetPurpose } from '../../../asset/domain/enums/media-asset-purpose.enum.js';
import { MediaAssetStatus } from '../../../asset/domain/enums/media-asset-status.enum.js';
import type { MediaAssetRepository } from '../../../asset/domain/repositories/media-asset.repository.js';
import { GetAppointmentsForDoctorAndPatientUseCase } from '../../../consultation/application/use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { ListAppointmentsForDoctorUseCase } from '../../../consultation/application/use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';
import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { ListInsuranceProvidersUseCase } from '../../../reference/application/use-cases/list-insurance-providers/list-insurance-providers.use-case.js';
import { ListMedicalSpecialtiesUseCase } from '../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { MedicalSpecialty } from '../../../reference/domain/entities/medical-specialty.entity.js';
import type { InsuranceProviderRepository } from '../../../reference/domain/repositories/insurance-provider.repository.js';
import type { MedicalSpecialtyRepository } from '../../../reference/domain/repositories/medical-specialty.repository.js';
import { ListClinicalNotesForConsultationSessionUseCase } from '../../application/use-cases/list-clinical-notes-for-consultation-session/list-clinical-notes-for-consultation-session.use-case.js';
import { ListPrescriptionsForConsultationSessionUseCase } from '../../application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import { GetHealthGraphSubgraphUseCase } from '../../application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ClinicalNote } from '../../domain/entities/clinical-note.entity.js';
import { HealthGraph } from '../../domain/entities/health-graph.entity.js';
import { Prescription } from '../../domain/entities/prescription.entity.js';
import { CertaintyLevel } from '../../domain/enums/certainty-level.enum.js';
import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import { NodeSource } from '../../domain/enums/node-source.enum.js';
import type { ClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';
import type { HealthGraphRepository } from '../../domain/repositories/health-graph.repository.js';
import type { PrescriptionRepository } from '../../domain/repositories/prescription.repository.js';

import { DoctorPatientChartController } from './doctor-patient-chart.controller.js';

const DOCTOR_A_TOKEN = 'valid-doctor-a-token';
const DOCTOR_B_TOKEN = 'valid-doctor-b-token';
const DOCTOR_C_TOKEN = 'valid-doctor-c-token';

class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();
  constructor(accounts: Account[]) {
    for (const account of accounts) this.byId.set(account.getId().toString(), account);
  }
  async findById(id: AccountId): Promise<Account | null> {
    return this.byId.get(id.toString()) ?? null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }
  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
  }
  async save(): Promise<void> {}
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
  private readonly byId = new Map<string, DoctorProfile>();
  private readonly byAccountId = new Map<string, DoctorProfile>();
  constructor(profiles: DoctorProfile[]) {
    for (const profile of profiles) {
      this.byId.set(profile.getId(), profile);
      this.byAccountId.set(profile.getAccountId(), profile);
    }
  }
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.byAccountId.get(accountId) ?? null;
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

class InMemoryInsuranceProviderRepository implements InsuranceProviderRepository {
  async findAll() {
    return [];
  }
  async findById() {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryAppointmentRepository implements Partial<AppointmentRepository> {
  constructor(private readonly appointments: Appointment[]) {}
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getDoctorId() === doctorId);
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
}

class InMemoryConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly sessions: ConsultationSession[]) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.sessions.find((s) => s.getId() === id) ?? null;
  }
  async findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null> {
    return this.sessions.find((s) => s.getAppointmentId() === appointmentId) ?? null;
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class InMemoryPrescriptionRepository implements PrescriptionRepository {
  constructor(private readonly prescriptions: Prescription[]) {}
  async findById(id: string): Promise<Prescription | null> {
    return this.prescriptions.find((p) => p.getId() === id) ?? null;
  }
  async findByConsultationSessionId(consultationSessionId: string): Promise<Prescription[]> {
    return this.prescriptions.filter((p) => p.getConsultationSessionId() === consultationSessionId);
  }
  async save(): Promise<void> {}
}

class InMemoryClinicalNoteRepository implements ClinicalNoteRepository {
  constructor(private readonly notes: ClinicalNote[]) {}
  async findById(id: string): Promise<ClinicalNote | null> {
    return this.notes.find((n) => n.getId() === id) ?? null;
  }
  async findByConsultationSessionId(consultationSessionId: string): Promise<ClinicalNote[]> {
    return this.notes.filter((n) => n.getConsultationSessionId() === consultationSessionId);
  }
  async save(): Promise<void> {}
}

class InMemoryHealthGraphRepository implements HealthGraphRepository {
  constructor(private readonly graph: HealthGraph) {}
  async findById(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async findByPatientId(patientId: string): Promise<HealthGraph | null> {
    return this.graph.getPatientId() === patientId ? this.graph : null;
  }
  async save(): Promise<void> {}
}

class InMemoryMediaAssetRepository implements MediaAssetRepository {
  constructor(private readonly assets: MediaAsset[]) {}
  async findById(id: string): Promise<MediaAsset | null> {
    return this.assets.find((a) => a.getId() === id) ?? null;
  }
  async findByOwner(ownerAccountId: string, purposes?: MediaAssetPurpose[]): Promise<MediaAsset[]> {
    return this.assets.filter(
      (a) => a.getOwnerAccountId() === ownerAccountId && (!purposes || purposes.includes(a.getPurpose())),
    );
  }
  async save(): Promise<void> {}
}

class FakeObjectStorage implements ObjectStoragePort {
  async createPresignedUploadUrl(): Promise<string> {
    return 'unused';
  }
  async createPresignedDownloadUrl(storageKey: string): Promise<string> {
    return `https://storage.example.com/${storageKey}?download=true`;
  }
  async checkConnectivity(): Promise<void> {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly accountIdByToken: Record<string, string>) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    const accountId = this.accountIdByToken[token];
    if (!accountId) throw new Error('invalid token');
    return { accountId, role: AccountRole.Doctor };
  }
}

// DOCTOR-OWNED ENCOUNTERS ONLY: Doctor A and Doctor B have each separately
// treated the SAME patient -- the exact scenario that proves this
// controller's authorization is a real per-doctor relationship check, not
// just "any doctor who has ever seen this patient."
describe('DoctorPatientChartController (integration)', () => {
  let app: INestApplication;
  let patient: PatientProfile;
  let doctorAAccount: Account;
  let doctorBAccount: Account;
  let doctorA: DoctorProfile;
  let doctorB: DoctorProfile;
  let noteA: ClinicalNote;
  let noteB: ClinicalNote;
  let prescriptionA: Prescription;
  let prescriptionB: Prescription;
  let clinicalDocument: MediaAsset;
  let verificationDocument: MediaAsset;

  before(async () => {
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Nadia Fawzy'),
    });
    patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });

    doctorAAccount = Account.register({
      email: EmailAddress.create('doctor-a@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. A'),
    });
    doctorA = DoctorProfile.register({
      accountId: doctorAAccount.getId().toString(),
      licenseNumber: 'LIC-A',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    doctorBAccount = Account.register({
      email: EmailAddress.create('doctor-b@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. B'),
    });
    doctorB = DoctorProfile.register({
      accountId: doctorBAccount.getId().toString(),
      licenseNumber: 'LIC-B',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    // Doctor C never appears in any repository fixture below -- an account
    // with a real DoctorProfile but zero appointments with this patient.
    const doctorCAccount = Account.register({
      email: EmailAddress.create('doctor-c@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. C'),
    });
    const doctorC = DoctorProfile.register({
      accountId: doctorCAccount.getId().toString(),
      licenseNumber: 'LIC-C',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    const appointmentA = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctorA.getId(),
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      pricing: ConsultationPricing.free(),
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    appointmentA.confirm();
    const sessionA = ConsultationSession.open(appointmentA.getId());

    const appointmentB = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctorB.getId(),
      availabilityWindowId: '33333333-3333-4333-8333-333333333334',
      pricing: ConsultationPricing.free(),
      scheduledAt: new Date(Date.now() + 2 * 60 * 60_000),
    });
    appointmentB.confirm();
    const sessionB = ConsultationSession.open(appointmentB.getId());

    noteA = ClinicalNote.author({
      consultationSessionId: sessionA.getId(),
      authoringDoctorId: doctorA.getId(),
      content: 'Doctor A note.',
    });
    noteB = ClinicalNote.author({
      consultationSessionId: sessionB.getId(),
      authoringDoctorId: doctorB.getId(),
      content: 'Doctor B note.',
    });

    prescriptionA = Prescription.sign({
      consultationSessionId: sessionA.getId(),
      diagnosisNodeId: '44444444-4444-4444-8444-444444444444',
      authoringDoctorId: doctorA.getId(),
      lineItems: [
        { drugCatalogId: '55555555-5555-4555-8555-555555555555', drugName: 'Drug A', dosage: '5mg', frequency: 'once daily', durationDays: 30 },
      ],
    });
    prescriptionB = Prescription.sign({
      consultationSessionId: sessionB.getId(),
      diagnosisNodeId: '44444444-4444-4444-8444-444444444445',
      authoringDoctorId: doctorB.getId(),
      lineItems: [
        { drugCatalogId: '55555555-5555-4555-8555-555555555556', drugName: 'Drug B', dosage: '10mg', frequency: 'twice daily', durationDays: 14 },
      ],
    });

    const healthGraph = HealthGraph.create(patient.getId());
    healthGraph.addNode({
      nodeType: HealthGraphNodeType.Condition,
      freeTextDescription: 'Condition per Doctor A',
      certaintyLevel: CertaintyLevel.Confirmed,
      source: NodeSource.Clinical,
      authoringDoctorId: doctorA.getId(),
    });
    healthGraph.addNode({
      nodeType: HealthGraphNodeType.Condition,
      freeTextDescription: 'Condition per Doctor B',
      certaintyLevel: CertaintyLevel.Confirmed,
      source: NodeSource.Clinical,
      authoringDoctorId: doctorB.getId(),
    });

    clinicalDocument = MediaAsset.reconstitute({
      id: '99999999-9999-4999-8999-999999999991',
      ownerAccountId: patientAccount.getId().toString(),
      purpose: MediaAssetPurpose.LabReport,
      contentType: 'application/pdf',
      storageKey: 'lab-report/99999999-9999-4999-8999-999999999991',
      status: MediaAssetStatus.Confirmed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    verificationDocument = MediaAsset.reconstitute({
      id: '99999999-9999-4999-8999-999999999992',
      ownerAccountId: patientAccount.getId().toString(),
      purpose: MediaAssetPurpose.NationalIdFront,
      contentType: 'image/png',
      storageKey: 'national_id_front/99999999-9999-4999-8999-999999999992',
      status: MediaAssetStatus.Confirmed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const appointmentRepository = new InMemoryAppointmentRepository([appointmentA, appointmentB]) as unknown as AppointmentRepository;
    const doctorProfileRepository = new InMemoryDoctorProfileRepository([doctorA, doctorB, doctorC]);
    const accountRepository = new InMemoryAccountRepository([doctorAAccount, doctorBAccount, doctorCAccount, patientAccount]);
    const patientProfileRepository = new InMemoryPatientProfileRepository(patient);
    const sessionRepository = new InMemoryConsultationSessionRepository([sessionA, sessionB]);
    const prescriptionRepository = new InMemoryPrescriptionRepository([prescriptionA, prescriptionB]);
    const noteRepository = new InMemoryClinicalNoteRepository([noteA, noteB]);
    const healthGraphRepository = new InMemoryHealthGraphRepository(healthGraph);
    const mediaAssetRepository = new InMemoryMediaAssetRepository([clinicalDocument, verificationDocument]);
    const specialtyRepository = new InMemoryMedicalSpecialtyRepository([
      MedicalSpecialty.reconstitute({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Cardiology',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    const moduleRef = await Test.createTestingModule({
      controllers: [DoctorPatientChartController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: JWT_SIGNER,
          useFactory: () =>
            new FakeJwtSigner({
              [DOCTOR_A_TOKEN]: doctorAAccount.getId().toString(),
              [DOCTOR_B_TOKEN]: doctorBAccount.getId().toString(),
              [DOCTOR_C_TOKEN]: doctorCAccount.getId().toString(),
            }),
        },
        { provide: GetDoctorProfileByAccountIdUseCase, useFactory: () => new GetDoctorProfileByAccountIdUseCase(doctorProfileRepository) },
        {
          provide: GetAppointmentsForDoctorAndPatientUseCase,
          useFactory: () =>
            new GetAppointmentsForDoctorAndPatientUseCase(new ListAppointmentsForDoctorUseCase(appointmentRepository)),
        },
        { provide: GetPatientProfileByIdUseCase, useFactory: () => new GetPatientProfileByIdUseCase(patientProfileRepository) },
        { provide: GetAccountByIdUseCase, useFactory: () => new GetAccountByIdUseCase(accountRepository) },
        { provide: ListInsuranceProvidersUseCase, useFactory: () => new ListInsuranceProvidersUseCase(new InMemoryInsuranceProviderRepository()) },
        {
          provide: GetConsultationSessionByAppointmentIdUseCase,
          useFactory: () => new GetConsultationSessionByAppointmentIdUseCase(sessionRepository),
        },
        { provide: ListMedicalSpecialtiesUseCase, useFactory: () => new ListMedicalSpecialtiesUseCase(specialtyRepository) },
        {
          provide: ListPrescriptionsForConsultationSessionUseCase,
          useFactory: () => new ListPrescriptionsForConsultationSessionUseCase(prescriptionRepository),
        },
        {
          provide: ListClinicalNotesForConsultationSessionUseCase,
          useFactory: () => new ListClinicalNotesForConsultationSessionUseCase(noteRepository),
        },
        {
          provide: GetHealthGraphSubgraphUseCase,
          useFactory: () => new GetHealthGraphSubgraphUseCase(healthGraphRepository, new GetPatientProfileByIdUseCase(patientProfileRepository)),
        },
        {
          provide: ListMediaAssetsForOwnerUseCase,
          useFactory: () => new ListMediaAssetsForOwnerUseCase(mediaAssetRepository, new FakeObjectStorage()),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get(`/doctor/patients/${patient.getId()}/profile`).expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('a doctor with a real appointment with the patient gets 200 with real profile fields', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctor/patients/${patient.getId()}/profile`)
      .set('Authorization', `Bearer ${DOCTOR_A_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.id, patient.getId());
    assert.equal(response.body.data.fullName, 'Nadia Fawzy');
  });

  it('a doctor with no relationship to the patient gets an ownership-safe not-found, not a 403', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctor/patients/${patient.getId()}/profile`)
      .set('Authorization', `Bearer ${DOCTOR_C_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it("Doctor A's medical-records never include Doctor B's clinical note or condition, even though both treated the same patient", async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctor/patients/${patient.getId()}/medical-records`)
      .set('Authorization', `Bearer ${DOCTOR_A_TOKEN}`)
      .expect(200);

    const ids: string[] = response.body.data.map((entry: { id: string }) => entry.id);
    assert.ok(ids.includes(noteA.getId()), "Doctor A's own note should be present");
    assert.ok(!ids.includes(noteB.getId()), "Doctor B's note must not leak into Doctor A's view");

    const titles: string[] = response.body.data.map((entry: { title: string }) => entry.title);
    assert.ok(titles.includes('Condition per Doctor A'));
    assert.ok(!titles.includes('Condition per Doctor B'));
  });

  it("Doctor B's medical-records never include Doctor A's clinical note or condition (symmetric isolation)", async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctor/patients/${patient.getId()}/medical-records`)
      .set('Authorization', `Bearer ${DOCTOR_B_TOKEN}`)
      .expect(200);

    const ids: string[] = response.body.data.map((entry: { id: string }) => entry.id);
    assert.ok(ids.includes(noteB.getId()));
    assert.ok(!ids.includes(noteA.getId()));
  });

  it('Doctor A sees only their own prescription for this patient, never Doctor B\'s', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctor/patients/${patient.getId()}/prescriptions`)
      .set('Authorization', `Bearer ${DOCTOR_A_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].id, prescriptionA.getId());
    assert.equal(response.body.data[0].medicationName, 'Drug A');
  });

  it("Doctor A's appointments list for this patient never includes Doctor B's appointment", async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctor/patients/${patient.getId()}/appointments`)
      .set('Authorization', `Bearer ${DOCTOR_A_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].doctorName, 'Dr. A');
  });

  it('an authorized doctor sees the clinical (lab-report) document but never the identity-verification document', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctor/patients/${patient.getId()}/documents`)
      .set('Authorization', `Bearer ${DOCTOR_A_TOKEN}`)
      .expect(200);

    const ids: string[] = response.body.data.map((doc: { id: string }) => doc.id);
    assert.ok(ids.includes(clinicalDocument.getId()));
    assert.ok(!ids.includes(verificationDocument.getId()));
    const found = response.body.data.find((doc: { id: string }) => doc.id === clinicalDocument.getId());
    assert.ok(found.signedUrl);
  });

  it('a doctor with no relationship cannot list the patient\'s documents either', async () => {
    const response = await request(app.getHttpServer())
      .get(`/doctor/patients/${patient.getId()}/documents`)
      .set('Authorization', `Bearer ${DOCTOR_C_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
