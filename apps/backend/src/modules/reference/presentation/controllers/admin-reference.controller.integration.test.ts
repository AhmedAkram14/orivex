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
import { COUNTRY_REPOSITORY, INSURANCE_PROVIDER_REPOSITORY, MEDICAL_SPECIALTY_REPOSITORY } from '../../application/ports/tokens.js';
import { CreateCountryUseCase } from '../../application/use-cases/create-country/create-country.use-case.js';
import { CreateInsuranceProviderUseCase } from '../../application/use-cases/create-insurance-provider/create-insurance-provider.use-case.js';
import { CreateMedicalSpecialtyUseCase } from '../../application/use-cases/create-medical-specialty/create-medical-specialty.use-case.js';
import { ListCountriesUseCase } from '../../application/use-cases/list-countries/list-countries.use-case.js';
import { ListInsuranceProvidersUseCase } from '../../application/use-cases/list-insurance-providers/list-insurance-providers.use-case.js';
import { ListMedicalSpecialtiesUseCase } from '../../application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { UpdateCountryUseCase } from '../../application/use-cases/update-country/update-country.use-case.js';
import { UpdateInsuranceProviderUseCase } from '../../application/use-cases/update-insurance-provider/update-insurance-provider.use-case.js';
import { UpdateMedicalSpecialtyUseCase } from '../../application/use-cases/update-medical-specialty/update-medical-specialty.use-case.js';
import { MedicalSpecialty } from '../../domain/entities/medical-specialty.entity.js';
import type { CountryRepository } from '../../domain/repositories/country.repository.js';
import type { InsuranceProviderRepository } from '../../domain/repositories/insurance-provider.repository.js';
import type { MedicalSpecialtyRepository } from '../../domain/repositories/medical-specialty.repository.js';

import { AdminReferenceController } from './admin-reference.controller.js';

const SUPER_ADMIN_TOKEN = 'valid-super-admin-token';
const DOCTOR_TOKEN = 'valid-doctor-token';

class FakeJwtSigner implements JwtSignerPort {
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token === SUPER_ADMIN_TOKEN) {
      return { accountId: '99999999-9999-4999-8999-999999999999', role: AccountRole.SuperAdmin };
    }
    if (token === DOCTOR_TOKEN) {
      return { accountId: '88888888-8888-4888-8888-888888888888', role: AccountRole.Doctor };
    }
    throw new Error('invalid token');
  }
}

class InMemoryMedicalSpecialtyRepository implements MedicalSpecialtyRepository {
  private readonly byId = new Map<string, MedicalSpecialty>();
  private readonly byName = new Set<string>();

  async findAll(): Promise<MedicalSpecialty[]> {
    return [...this.byId.values()];
  }
  async findById(id: string): Promise<MedicalSpecialty | null> {
    return this.byId.get(id) ?? null;
  }
  async save(specialty: MedicalSpecialty): Promise<void> {
    if (!this.byId.has(specialty.getId()) && this.byName.has(specialty.getName())) {
      const { MedicalSpecialtyAlreadyExistsError } = await import(
        '../../domain/exceptions/medical-specialty-already-exists.error.js'
      );
      throw new MedicalSpecialtyAlreadyExistsError(specialty.getName());
    }
    this.byId.set(specialty.getId(), specialty);
    this.byName.add(specialty.getName());
  }
}

// Minimal no-op fakes -- this suite focuses on MedicalSpecialty's CRUD +
// role gating; Country/InsuranceProvider follow the identical shape and are
// covered by their own use-case unit tests.
class NoopCountryRepository implements CountryRepository {
  async findAll() {
    return [];
  }
  async findById() {
    return null;
  }
  async save() {}
}
class NoopInsuranceProviderRepository implements InsuranceProviderRepository {
  async findAll() {
    return [];
  }
  async findById() {
    return null;
  }
  async save() {}
}

describe('AdminReferenceController (integration)', () => {
  let app: INestApplication;
  let specialtyRepo: InMemoryMedicalSpecialtyRepository;

  before(async () => {
    specialtyRepo = new InMemoryMedicalSpecialtyRepository();
    const countryRepo = new NoopCountryRepository();
    const insuranceRepo = new NoopInsuranceProviderRepository();

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminReferenceController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        { provide: MEDICAL_SPECIALTY_REPOSITORY, useFactory: () => specialtyRepo },
        { provide: COUNTRY_REPOSITORY, useValue: countryRepo },
        { provide: INSURANCE_PROVIDER_REPOSITORY, useValue: insuranceRepo },
        {
          provide: ListMedicalSpecialtiesUseCase,
          useFactory: (repo: MedicalSpecialtyRepository) => new ListMedicalSpecialtiesUseCase(repo),
          inject: [MEDICAL_SPECIALTY_REPOSITORY],
        },
        {
          provide: CreateMedicalSpecialtyUseCase,
          useFactory: (repo: MedicalSpecialtyRepository) => new CreateMedicalSpecialtyUseCase(repo),
          inject: [MEDICAL_SPECIALTY_REPOSITORY],
        },
        {
          provide: UpdateMedicalSpecialtyUseCase,
          useFactory: (repo: MedicalSpecialtyRepository) => new UpdateMedicalSpecialtyUseCase(repo),
          inject: [MEDICAL_SPECIALTY_REPOSITORY],
        },
        {
          provide: ListCountriesUseCase,
          useFactory: (repo: CountryRepository) => new ListCountriesUseCase(repo),
          inject: [COUNTRY_REPOSITORY],
        },
        {
          provide: CreateCountryUseCase,
          useFactory: (repo: CountryRepository) => new CreateCountryUseCase(repo),
          inject: [COUNTRY_REPOSITORY],
        },
        {
          provide: UpdateCountryUseCase,
          useFactory: (repo: CountryRepository) => new UpdateCountryUseCase(repo),
          inject: [COUNTRY_REPOSITORY],
        },
        {
          provide: ListInsuranceProvidersUseCase,
          useFactory: (repo: InsuranceProviderRepository) => new ListInsuranceProvidersUseCase(repo),
          inject: [INSURANCE_PROVIDER_REPOSITORY],
        },
        {
          provide: CreateInsuranceProviderUseCase,
          useFactory: (repo: InsuranceProviderRepository) => new CreateInsuranceProviderUseCase(repo),
          inject: [INSURANCE_PROVIDER_REPOSITORY],
        },
        {
          provide: UpdateInsuranceProviderUseCase,
          useFactory: (repo: InsuranceProviderRepository) => new UpdateInsuranceProviderUseCase(repo),
          inject: [INSURANCE_PROVIDER_REPOSITORY],
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

  it('POST /admin/reference/specialties rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).post('/admin/reference/specialties').send({ name: 'Oncology' }).expect(401);
  });

  it('POST /admin/reference/specialties rejects a non-SuperAdmin caller with 403', async () => {
    await request(app.getHttpServer())
      .post('/admin/reference/specialties')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({ name: 'Oncology' })
      .expect(403);
  });

  it('POST /admin/reference/specialties creates a specialty for a SuperAdmin caller', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/reference/specialties')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ name: 'Oncology' })
      .expect(201);

    assert.equal(response.body.data.name, 'Oncology');
    assert.equal(response.body.data.isActive, true);
  });

  it('POST /admin/reference/specialties rejects a duplicate name with 409', async () => {
    await request(app.getHttpServer())
      .post('/admin/reference/specialties')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ name: 'Oncology' })
      .expect(409);
  });

  it('GET /admin/reference/specialties lists every created specialty', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/reference/specialties')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
  });

  it('PATCH /admin/reference/specialties/:id deactivates a specialty', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/admin/reference/specialties')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .expect(200);
    const id = listResponse.body.data[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/admin/reference/specialties/${id}`)
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ isActive: false })
      .expect(200);

    assert.equal(response.body.data.isActive, false);
  });

  it('PATCH /admin/reference/specialties/:id returns 404 for an unknown id', async () => {
    await request(app.getHttpServer())
      .patch('/admin/reference/specialties/11111111-1111-4111-8111-111111111111')
      .set('Authorization', `Bearer ${SUPER_ADMIN_TOKEN}`)
      .send({ isActive: false })
      .expect(404);
  });
});
