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
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { HOSPITAL_REPOSITORY } from '../../application/ports/tokens.js';
import { ListHospitalsUseCase } from '../../application/use-cases/list-hospitals/list-hospitals.use-case.js';
import { Hospital } from '../../domain/entities/hospital.entity.js';
import type { HospitalRepository } from '../../domain/repositories/hospital.repository.js';

import { HospitalDirectoryController } from './hospital-directory.controller.js';

const PATIENT_TOKEN = 'valid-patient-token';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === PATIENT_TOKEN) {
      return { accountId: '11111111-1111-4111-8111-111111111111', role: AccountRole.Patient };
    }
    throw new Error('invalid token');
  }
}

class InMemoryHospitalRepository implements HospitalRepository {
  constructor(private readonly hospitals: Hospital[]) {}
  findAll(): Promise<Hospital[]> {
    return Promise.resolve(this.hospitals);
  }
  findById(id: string): Promise<Hospital | null> {
    return Promise.resolve(this.hospitals.find((hospital) => hospital.getId() === id) ?? null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

// Doctor Onboarding (Phase 4 continuation): any authenticated account (not
// just SuperAdmin) must be able to browse the hospital directory to pick an
// affiliation during onboarding -- deliberately not the SuperAdmin-only
// /admin/hospitals surface.
describe('HospitalDirectoryController (integration)', () => {
  let app: INestApplication;

  before(async () => {
    const hospital = Hospital.create({ name: 'Cairo General Hospital' });
    const hospitalRepository = new InMemoryHospitalRepository([hospital]);

    const moduleRef = await Test.createTestingModule({
      controllers: [HospitalDirectoryController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        { provide: HOSPITAL_REPOSITORY, useValue: hospitalRepository },
        {
          provide: ListHospitalsUseCase,
          useFactory: (repo: HospitalRepository) => new ListHospitalsUseCase(repo),
          inject: [HOSPITAL_REPOSITORY],
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

  it('GET /hospitals rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).get('/hospitals').expect(401);
  });

  it('GET /hospitals is reachable by a plain Patient account, not just SuperAdmin', async () => {
    const response = await request(app.getHttpServer())
      .get('/hospitals')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].name, 'Cairo General Hospital');
  });
});
