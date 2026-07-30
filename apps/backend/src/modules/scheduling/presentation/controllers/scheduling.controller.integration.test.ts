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
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { HOLIDAY_REPOSITORY, SCHEDULE_EXCEPTION_REPOSITORY, WORKING_HOURS_REPOSITORY } from '../../application/ports/tokens.js';
import { AddScheduleExceptionUseCase } from '../../application/use-cases/add-schedule-exception/add-schedule-exception.use-case.js';
import { GetDoctorWorkingHoursUseCase } from '../../application/use-cases/get-doctor-working-hours/get-doctor-working-hours.use-case.js';
import { GetSchedulingRulesUseCase } from '../../application/use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';
import { ListHolidaysUseCase } from '../../application/use-cases/list-holidays/list-holidays.use-case.js';
import { ListScheduleExceptionsForDoctorUseCase } from '../../application/use-cases/list-schedule-exceptions-for-doctor/list-schedule-exceptions-for-doctor.use-case.js';
import { RemoveScheduleExceptionUseCase } from '../../application/use-cases/remove-schedule-exception/remove-schedule-exception.use-case.js';
import { UpdateDoctorWorkingHoursUseCase } from '../../application/use-cases/update-doctor-working-hours/update-doctor-working-hours.use-case.js';
import { Holiday } from '../../domain/entities/holiday.entity.js';
import { ScheduleException } from '../../domain/entities/schedule-exception.entity.js';
import type { WorkingHoursDay } from '../../domain/entities/working-hours-day.entity.js';
import type { HolidayRepository } from '../../domain/repositories/holiday.repository.js';
import type { ScheduleExceptionRepository } from '../../domain/repositories/schedule-exception.repository.js';
import type { WorkingHoursRepository } from '../../domain/repositories/working-hours.repository.js';

import { SchedulingController } from './scheduling.controller.js';

const DOCTOR_TOKEN = 'valid-doctor-token';
const PATIENT_TOKEN = 'valid-patient-token';
const NO_PROFILE_DOCTOR_TOKEN = 'valid-doctor-no-profile-token';

const DOCTOR_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const PATIENT_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const NO_PROFILE_DOCTOR_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profiles: DoctorProfile[]) {}
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.profiles.find((p) => p.getId() === id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.profiles.find((p) => p.getAccountId() === accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class FakeWorkingHoursRepository implements WorkingHoursRepository {
  private readonly byDoctorId = new Map<string, WorkingHoursDay[]>();
  async findByDoctorId(doctorId: string): Promise<WorkingHoursDay[]> {
    return this.byDoctorId.get(doctorId) ?? [];
  }
  async findByDoctorIds(): Promise<Map<string, WorkingHoursDay[]>> {
    return new Map();
  }
  async replaceAllForDoctor(doctorId: string, days: WorkingHoursDay[]): Promise<WorkingHoursDay[]> {
    this.byDoctorId.set(doctorId, days);
    return days;
  }
}

class FakeScheduleExceptionRepository implements ScheduleExceptionRepository {
  private readonly items: ScheduleException[] = [];
  async findById(id: string): Promise<ScheduleException | null> {
    return this.items.find((i) => i.getId() === id) ?? null;
  }
  async findByDoctorId(doctorId: string): Promise<ScheduleException[]> {
    return this.items.filter((i) => i.getDoctorId() === doctorId);
  }
  async findByDoctorIdsAndDates(): Promise<ScheduleException[]> {
    return [];
  }
  async save(exception: ScheduleException): Promise<void> {
    this.items.push(exception);
  }
  async deleteById(id: string): Promise<void> {
    const index = this.items.findIndex((i) => i.getId() === id);
    if (index >= 0) this.items.splice(index, 1);
  }
}

class FakeHolidayRepository implements HolidayRepository {
  async findAll(): Promise<Holiday[]> {
    return [Holiday.reconstitute({ id: 'holiday-1', date: '2026-01-07', name: 'Coptic Christmas Day' })];
  }
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly claimsByToken: Map<string, AccessTokenClaims>) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    const claims = this.claimsByToken.get(token);
    if (!claims) throw new Error('invalid token');
    return claims;
  }
}

describe('SchedulingController (integration)', () => {
  let app: INestApplication;

  before(async () => {
    const doctorProfile = DoctorProfile.register({
      accountId: DOCTOR_ACCOUNT_ID,
      licenseNumber: 'LIC-1',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });
    const doctorProfileRepository = new InMemoryDoctorProfileRepository([doctorProfile]);

    const jwtSigner = new FakeJwtSigner(
      new Map<string, AccessTokenClaims>([
        [DOCTOR_TOKEN, { accountId: DOCTOR_ACCOUNT_ID, role: AccountRole.Doctor }],
        [PATIENT_TOKEN, { accountId: PATIENT_ACCOUNT_ID, role: AccountRole.Patient }],
        [NO_PROFILE_DOCTOR_TOKEN, { accountId: NO_PROFILE_DOCTOR_ACCOUNT_ID, role: AccountRole.Doctor }],
      ]),
    );

    const workingHoursRepository = new FakeWorkingHoursRepository();
    const scheduleExceptionRepository = new FakeScheduleExceptionRepository();
    const holidayRepository = new FakeHolidayRepository();

    const moduleRef = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useFactory: () => jwtSigner },
        { provide: WORKING_HOURS_REPOSITORY, useValue: workingHoursRepository },
        { provide: SCHEDULE_EXCEPTION_REPOSITORY, useValue: scheduleExceptionRepository },
        { provide: HOLIDAY_REPOSITORY, useValue: holidayRepository },
        {
          provide: GetDoctorProfileByAccountIdUseCase,
          useFactory: () => new GetDoctorProfileByAccountIdUseCase(doctorProfileRepository),
        },
        {
          provide: GetDoctorWorkingHoursUseCase,
          useFactory: (repo: WorkingHoursRepository) => new GetDoctorWorkingHoursUseCase(repo),
          inject: [WORKING_HOURS_REPOSITORY],
        },
        {
          provide: UpdateDoctorWorkingHoursUseCase,
          useFactory: (repo: WorkingHoursRepository) => new UpdateDoctorWorkingHoursUseCase(repo),
          inject: [WORKING_HOURS_REPOSITORY],
        },
        {
          provide: ListScheduleExceptionsForDoctorUseCase,
          useFactory: (repo: ScheduleExceptionRepository) => new ListScheduleExceptionsForDoctorUseCase(repo),
          inject: [SCHEDULE_EXCEPTION_REPOSITORY],
        },
        {
          provide: AddScheduleExceptionUseCase,
          useFactory: (repo: ScheduleExceptionRepository) => new AddScheduleExceptionUseCase(repo),
          inject: [SCHEDULE_EXCEPTION_REPOSITORY],
        },
        {
          provide: RemoveScheduleExceptionUseCase,
          useFactory: (repo: ScheduleExceptionRepository) => new RemoveScheduleExceptionUseCase(repo),
          inject: [SCHEDULE_EXCEPTION_REPOSITORY],
        },
        {
          provide: ListHolidaysUseCase,
          useFactory: (repo: HolidayRepository) => new ListHolidaysUseCase(repo),
          inject: [HOLIDAY_REPOSITORY],
        },
        GetSchedulingRulesUseCase,
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

  it('GET /scheduling/doctor-availability rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/scheduling/doctor-availability').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /scheduling/doctor-availability rejects a patient role with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/scheduling/doctor-availability')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('GET /scheduling/doctor-availability returns a computed default of 7 days when never configured', async () => {
    const response = await request(app.getHttpServer())
      .get('/scheduling/doctor-availability')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 7);
    assert.ok(response.body.data.every((day: { isWorkingDay: boolean }) => day.isWorkingDay === false));
  });

  it('GET /scheduling/doctor-availability returns 404 when the caller has no doctor profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/scheduling/doctor-availability')
      .set('Authorization', `Bearer ${NO_PROFILE_DOCTOR_TOKEN}`)
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('PATCH /scheduling/doctor-availability replaces all 7 days and GET reflects it', async () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((dayOfWeek) => ({
      dayOfWeek,
      isWorkingDay: dayOfWeek === 'monday',
      hours: { start: '08:00', end: '16:00' },
      breaks: [],
    }));

    const patchResponse = await request(app.getHttpServer())
      .patch('/scheduling/doctor-availability')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send(days)
      .expect(200);

    assert.equal(patchResponse.body.data.length, 7);
    const monday = patchResponse.body.data.find((d: { dayOfWeek: string }) => d.dayOfWeek === 'monday');
    assert.equal(monday.isWorkingDay, true);

    const getResponse = await request(app.getHttpServer())
      .get('/scheduling/doctor-availability')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);
    const mondayAgain = getResponse.body.data.find((d: { dayOfWeek: string }) => d.dayOfWeek === 'monday');
    assert.equal(mondayAgain.isWorkingDay, true);
  });

  it('PATCH /scheduling/doctor-availability rejects fewer than 7 days with a validation error', async () => {
    // ParseArrayPipe validates each array element's shape but not the
    // array's own length -- the "exactly 7" invariant is a real domain rule
    // (UpdateDoctorWorkingHoursUseCase), so it surfaces as this module's
    // standard 422 VALIDATION_FAILED, not a 400.
    const response = await request(app.getHttpServer())
      .patch('/scheduling/doctor-availability')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send([{ dayOfWeek: 'monday', isWorkingDay: true, hours: { start: '08:00', end: '16:00' }, breaks: [] }])
      .expect(422);
    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  let createdExceptionId: string;

  it('POST /scheduling/doctor-exceptions creates a vacation exception', async () => {
    const response = await request(app.getHttpServer())
      .post('/scheduling/doctor-exceptions')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({ date: '2026-08-01', type: 'vacation' })
      .expect(201);

    assert.equal(response.body.data.date, '2026-08-01');
    assert.equal(response.body.data.type, 'vacation');
    createdExceptionId = response.body.data.id;
  });

  it('GET /scheduling/doctor-exceptions returns the created exception', async () => {
    const response = await request(app.getHttpServer())
      .get('/scheduling/doctor-exceptions')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].id, createdExceptionId);
  });

  it('DELETE /scheduling/doctor-exceptions/:id removes the exception', async () => {
    await request(app.getHttpServer())
      .delete(`/scheduling/doctor-exceptions/${createdExceptionId}`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(204);

    const response = await request(app.getHttpServer())
      .get('/scheduling/doctor-exceptions')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);
    assert.equal(response.body.data.length, 0);
  });

  it('DELETE /scheduling/doctor-exceptions/:id returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .delete('/scheduling/doctor-exceptions/44444444-4444-4444-8444-444444444444')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /scheduling/holidays is readable by a patient (no role restriction)', async () => {
    const response = await request(app.getHttpServer())
      .get('/scheduling/holidays')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);
    assert.equal(response.body.data[0].name, 'Coptic Christmas Day');
  });

  it('GET /scheduling/rules is readable by a patient and returns the hardcoded constants', async () => {
    const response = await request(app.getHttpServer())
      .get('/scheduling/rules')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);
    assert.equal(response.body.data.slotDurationMinutes, 30);
    assert.equal(response.body.data.bufferMinutes, 5);
  });

  it('GET /scheduling/rules rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/scheduling/rules').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });
});
