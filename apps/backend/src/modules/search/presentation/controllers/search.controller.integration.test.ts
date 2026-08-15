import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { AppointmentSearchResult } from '../../application/ports/search-appointments.port.js';
import type { DoctorSearchResult } from '../../application/ports/search-doctors.port.js';
import type { PatientSearchResult } from '../../application/ports/search-patients.port.js';
import { GlobalSearchUseCase } from '../../application/use-cases/global-search/global-search.use-case.js';

import { SearchController } from './search.controller.js';

const PATIENT_A_TOKEN = 'valid-patient-a-token';
const PATIENT_B_TOKEN = 'valid-patient-b-token';
const DOCTOR_TOKEN = 'valid-doctor-token';
const SUPER_ADMIN_TOKEN = 'valid-super-admin-token';

const PATIENT_A_ACCOUNT = '11111111-1111-4111-8111-111111111111';
const PATIENT_B_ACCOUNT = '22222222-2222-4222-8222-222222222222';
const DOCTOR_ACCOUNT = '33333333-3333-4333-8333-333333333333';
const SUPER_ADMIN_ACCOUNT = '44444444-4444-4444-8444-444444444444';

const PATIENT_A_PROFILE_ID = 'patient-a-profile';
const PATIENT_B_PROFILE_ID = 'patient-b-profile';
const DOCTOR_PROFILE_ID = 'doctor-profile';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === PATIENT_A_TOKEN) return { accountId: PATIENT_A_ACCOUNT, role: AccountRole.Patient };
    if (token === PATIENT_B_TOKEN) return { accountId: PATIENT_B_ACCOUNT, role: AccountRole.Patient };
    if (token === DOCTOR_TOKEN) return { accountId: DOCTOR_ACCOUNT, role: AccountRole.Doctor };
    if (token === SUPER_ADMIN_TOKEN) return { accountId: SUPER_ADMIN_ACCOUNT, role: AccountRole.SuperAdmin };
    throw new Error('invalid token');
  }
}

// A realistic in-memory dataset that lets the fake ports enforce the exact
// same scoping semantics the real Prisma WHERE clauses enforce -- this is
// what proves cross-account isolation at the controller/use-case level in
// this repo's existing fake-provider integration-test convention (see
// ReportingController's own integration test), since this codebase has no
// real-Prisma-test-DB integration tests anywhere to model on instead.
const DOCTORS = [
  { doctorProfileId: 'doctor-profile', displayName: 'Dr. Amina Youssef', specialtyName: 'Cardiology' },
  { doctorProfileId: 'doctor-other', displayName: 'Dr. Omar Adel', specialtyName: 'Dermatology' },
];

// patientAppointments: which doctorProfileId each patient has a real
// appointment with -- the ground truth PrismaSearchPatientsQueryService's
// `appointments: { some: { doctorId } }` filter would enforce for real.
const PATIENTS = [
  { patientProfileId: PATIENT_A_PROFILE_ID, displayName: 'John Patient A', treatedByDoctorIds: [DOCTOR_PROFILE_ID] },
  { patientProfileId: PATIENT_B_PROFILE_ID, displayName: 'John Patient B', treatedByDoctorIds: [] },
];

const APPOINTMENTS = [
  { appointmentId: 'appt-a1', patientId: PATIENT_A_PROFILE_ID, doctorId: DOCTOR_PROFILE_ID, counterpartOfPatient: 'Dr. Amina Youssef', counterpartOfDoctor: 'John Patient A', scheduledAt: new Date('2026-01-10'), status: 'confirmed' },
  { appointmentId: 'appt-a2', patientId: PATIENT_A_PROFILE_ID, doctorId: DOCTOR_PROFILE_ID, counterpartOfPatient: 'Dr. Amina Youssef', counterpartOfDoctor: 'John Patient A', scheduledAt: new Date('2026-01-11'), status: 'completed' },
  { appointmentId: 'appt-b1', patientId: PATIENT_B_PROFILE_ID, doctorId: 'doctor-other', counterpartOfPatient: 'Dr. Omar Adel', counterpartOfDoctor: 'John Patient B', scheduledAt: new Date('2026-01-12'), status: 'confirmed' },
];

function contains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

class FakeSearchDoctorsPort {
  async searchPublic({ query, limit }: { query: string; limit: number }): Promise<DoctorSearchResult> {
    const entries = DOCTORS.filter(
      (d) => contains(d.displayName, query) || contains(d.specialtyName, query),
    );
    return { entries: entries.slice(0, limit), total: entries.length };
  }
  async searchAdmin({ query, limit }: { query: string; limit: number }): Promise<DoctorSearchResult> {
    const entries = DOCTORS.filter((d) => contains(d.displayName, query));
    return { entries: entries.slice(0, limit), total: entries.length };
  }
}

class FakeSearchPatientsPort {
  async searchForDoctor({
    doctorProfileId,
    query,
    limit,
  }: {
    doctorProfileId: string;
    query: string;
    limit: number;
  }): Promise<PatientSearchResult> {
    const entries = PATIENTS.filter(
      (p) => contains(p.displayName, query) && p.treatedByDoctorIds.includes(doctorProfileId),
    ).map((p) => ({ patientProfileId: p.patientProfileId, displayName: p.displayName }));
    return { entries: entries.slice(0, limit), total: entries.length };
  }
  async searchAdmin({ query, limit }: { query: string; limit: number }): Promise<PatientSearchResult> {
    const entries = PATIENTS.filter((p) => contains(p.displayName, query)).map((p) => ({
      patientProfileId: p.patientProfileId,
      displayName: p.displayName,
    }));
    return { entries: entries.slice(0, limit), total: entries.length };
  }
}

class FakeSearchAppointmentsPort {
  async searchForPatient({
    patientProfileId,
    query,
    limit,
  }: {
    patientProfileId: string;
    query: string;
    limit: number;
  }): Promise<AppointmentSearchResult> {
    const entries = APPOINTMENTS.filter((a) => a.patientId === patientProfileId && contains(a.counterpartOfPatient, query)).map(
      (a) => ({ appointmentId: a.appointmentId, counterpartName: a.counterpartOfPatient, scheduledAt: a.scheduledAt, status: a.status }),
    );
    return { entries: entries.slice(0, limit), total: entries.length };
  }
  async searchForDoctor({
    doctorProfileId,
    query,
    limit,
  }: {
    doctorProfileId: string;
    query: string;
    limit: number;
  }): Promise<AppointmentSearchResult> {
    const entries = APPOINTMENTS.filter((a) => a.doctorId === doctorProfileId && contains(a.counterpartOfDoctor, query)).map(
      (a) => ({ appointmentId: a.appointmentId, counterpartName: a.counterpartOfDoctor, scheduledAt: a.scheduledAt, status: a.status }),
    );
    return { entries: entries.slice(0, limit), total: entries.length };
  }
}

describe('SearchController (integration)', () => {
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        JwtAuthGuard,
        Reflector,
        PinoLoggerService,
        {
          provide: GetDoctorProfileByAccountIdUseCase,
          useValue: {
            execute: async ({ accountId }: { accountId: string }) =>
              accountId === DOCTOR_ACCOUNT ? { getId: () => DOCTOR_PROFILE_ID } : null,
          },
        },
        {
          provide: GetPatientProfileByAccountIdUseCase,
          useValue: {
            execute: async ({ accountId }: { accountId: string }) => {
              if (accountId === PATIENT_A_ACCOUNT) return { getId: () => PATIENT_A_PROFILE_ID };
              if (accountId === PATIENT_B_ACCOUNT) return { getId: () => PATIENT_B_PROFILE_ID };
              return null;
            },
          },
        },
        {
          provide: GlobalSearchUseCase,
          useFactory: (
            getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
            getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
          ) =>
            new GlobalSearchUseCase(
              new FakeSearchDoctorsPort(),
              new FakeSearchPatientsPort(),
              new FakeSearchAppointmentsPort(),
              getDoctorProfileByAccountIdUseCase,
              getPatientProfileByAccountIdUseCase,
            ),
          inject: [GetDoctorProfileByAccountIdUseCase, GetPatientProfileByAccountIdUseCase],
        },
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

  it('GET /search rejects an unauthenticated request with 401', async () => {
    await request(app.getHttpServer()).get('/search?q=amina').expect(401);
  });

  it('doctor search (patient caller) returns real matching doctors with a real specialty subtitle', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=amina&type=doctor')
      .set('Authorization', `Bearer ${PATIENT_A_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.results.length, 1);
    assert.deepEqual(response.body.data.results[0], {
      type: 'doctor',
      id: 'doctor-profile',
      title: 'Dr. Amina Youssef',
      subtitle: 'Cardiology',
    });
  });

  it('doctor search (superadmin caller) returns real matching doctors platform-wide', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=omar&type=doctor')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.results.length, 1);
    assert.equal(response.body.data.results[0].title, 'Dr. Omar Adel');
  });

  it('patient search (doctor caller) only returns patients that doctor has a real appointment with', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=john&type=patient')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    // Patient B matches the name query but has NO appointment with this
    // doctor -- must never appear, even though the name is a real match.
    assert.deepEqual(
      response.body.data.results.map((r: { id: string }) => r.id),
      [PATIENT_A_PROFILE_ID],
    );
    assert.equal(response.body.data.results[0].subtitle, 'Patient');
  });

  it('patient caller searching type=patient always returns zero results, a hard block', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=john&type=patient')
      .set('Authorization', `Bearer ${PATIENT_A_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data.results, []);
    assert.equal(response.body.data.total, 0);
  });

  it('appointment search (patient caller) only returns that patient\'s own appointments', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=amina&type=appointment')
      .set('Authorization', `Bearer ${PATIENT_A_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.results.length, 2);
    assert.ok(response.body.data.results.every((r: { id: string }) => ['appt-a1', 'appt-a2'].includes(r.id)));
  });

  it('appointment search (patient caller) never returns another patient\'s matching appointment', async () => {
    // Patient B's own appointment counterpart name is "Dr. Omar Adel" --
    // Patient A searching for "omar" must get nothing, since Patient A has
    // no appointment with that doctor.
    const response = await request(app.getHttpServer())
      .get('/search?q=omar&type=appointment')
      .set('Authorization', `Bearer ${PATIENT_A_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data.results, []);
  });

  it('appointment search (doctor caller) only returns that doctor\'s own appointments', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=john&type=appointment')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.results.length, 2);
    assert.ok(response.body.data.results.every((r: { id: string }) => ['appt-a1', 'appt-a2'].includes(r.id)));
    // Cross-account isolation: appt-b1 (a different doctor's appointment)
    // must never appear even though its patient's name also matches "john".
    assert.ok(!response.body.data.results.some((r: { id: string }) => r.id === 'appt-b1'));
  });

  it('superadmin appointment search returns empty -- intentionally omitted, not an error', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=john&type=appointment')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data.results, []);
    assert.equal(response.body.data.total, 0);
  });

  it('mixed/unfiltered search (no type) returns results from every type that role is allowed to see, in one call', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=a')
      .set('Authorization', `Bearer ${PATIENT_A_TOKEN}`)
      .expect(200);

    // q="a" is 1 char -- too short, must be empty regardless of role.
    assert.deepEqual(response.body.data.results, []);

    const mixed = await request(app.getHttpServer())
      .get('/search?q=am')
      .set('Authorization', `Bearer ${PATIENT_A_TOKEN}`)
      .expect(200);

    const types = new Set(mixed.body.data.results.map((r: { type: string }) => r.type));
    // "am" matches "Dr. Amina Youssef" (doctor) and that doctor is the
    // counterpart on Patient A's own appointments (appointment) -- patient
    // type is never included for a Patient caller.
    assert.ok(types.has('doctor'));
    assert.ok(!types.has('patient'));
  });

  it('q shorter than 2 chars returns an empty result with no error', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=a')
      .set('Authorization', `Bearer ${PATIENT_A_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, { results: [], total: 0 });
  });

  it('a query matching zero real rows returns empty results with total 0, not an error', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=zzzznomatch&type=doctor')
      .set('Authorization', `Bearer ${PATIENT_A_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, { results: [], total: 0 });
  });

  it('limit is honestly respected -- exactly `limit` returned per type, total still reflects the real full count', async () => {
    const response = await request(app.getHttpServer())
      .get('/search?q=John&type=patient&limit=1')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.results.length, 1);
    assert.equal(response.body.data.total, 2);
  });

  it('the serialized response never contains a clinical/PHI field name for any of the above cases', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer()).get('/search?q=amina&type=doctor').set('Authorization', `Bearer ${PATIENT_A_TOKEN}`),
      request(app.getHttpServer()).get('/search?q=john&type=patient').set('Authorization', `Bearer ${DOCTOR_TOKEN}`),
      request(app.getHttpServer()).get('/search?q=amina&type=appointment').set('Authorization', `Bearer ${PATIENT_A_TOKEN}`),
      request(app.getHttpServer()).get('/search?q=amina&type=doctor').set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`),
    ]);

    for (const response of responses) {
      const body = JSON.stringify(response.body);
      assert.doesNotMatch(body, /allergies/i);
      assert.doesNotMatch(body, /chronicDiseases/i);
      assert.doesNotMatch(body, /bloodType/i);
      assert.doesNotMatch(body, /diagnosis/i);
      assert.doesNotMatch(body, /prescription/i);
      assert.doesNotMatch(body, /clinicalNote/i);
    }
  });
});
