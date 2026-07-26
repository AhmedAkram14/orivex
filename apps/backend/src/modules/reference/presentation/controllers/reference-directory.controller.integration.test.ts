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
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { COUNTRY_REPOSITORY, INSURANCE_PROVIDER_REPOSITORY, MEDICAL_SPECIALTY_REPOSITORY } from '../../application/ports/tokens.js';
import { ListCountriesUseCase } from '../../application/use-cases/list-countries/list-countries.use-case.js';
import { ListInsuranceProvidersUseCase } from '../../application/use-cases/list-insurance-providers/list-insurance-providers.use-case.js';
import { ListMedicalSpecialtiesUseCase } from '../../application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { Country } from '../../domain/entities/country.entity.js';
import { InsuranceProvider } from '../../domain/entities/insurance-provider.entity.js';
import { MedicalSpecialty } from '../../domain/entities/medical-specialty.entity.js';
import type { CountryRepository } from '../../domain/repositories/country.repository.js';
import type { InsuranceProviderRepository } from '../../domain/repositories/insurance-provider.repository.js';
import type { MedicalSpecialtyRepository } from '../../domain/repositories/medical-specialty.repository.js';

import { ReferenceDirectoryController } from './reference-directory.controller.js';

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

class InMemoryMedicalSpecialtyRepository implements MedicalSpecialtyRepository {
  constructor(private readonly rows: MedicalSpecialty[]) {}
  findAll(): Promise<MedicalSpecialty[]> {
    return Promise.resolve(this.rows);
  }
  findById(id: string): Promise<MedicalSpecialty | null> {
    return Promise.resolve(this.rows.find((r) => r.getId() === id) ?? null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class InMemoryCountryRepository implements CountryRepository {
  constructor(private readonly rows: Country[]) {}
  findAll(): Promise<Country[]> {
    return Promise.resolve(this.rows);
  }
  findById(id: string): Promise<Country | null> {
    return Promise.resolve(this.rows.find((r) => r.getId() === id) ?? null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class InMemoryInsuranceProviderRepository implements InsuranceProviderRepository {
  constructor(private readonly rows: InsuranceProvider[]) {}
  findAll(): Promise<InsuranceProvider[]> {
    return Promise.resolve(this.rows);
  }
  findById(id: string): Promise<InsuranceProvider | null> {
    return Promise.resolve(this.rows.find((r) => r.getId() === id) ?? null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

// Onboarding Redesign (2026-07-21 proposal, §5/§14 Stage O.1): any
// authenticated account (not just SuperAdmin) must be able to browse
// reference data to populate onboarding dropdowns -- deliberately not the
// SuperAdmin-only /admin/reference/* surface. Mirrors
// HospitalDirectoryController's own integration test exactly.
describe('ReferenceDirectoryController (integration)', () => {
  let app: INestApplication;

  before(async () => {
    const specialtyRepo = new InMemoryMedicalSpecialtyRepository([MedicalSpecialty.create({ name: 'Cardiology' })]);
    const countryRepo = new InMemoryCountryRepository([Country.create({ name: 'Egypt', iso2Code: 'EG' })]);
    const insuranceRepo = new InMemoryInsuranceProviderRepository([InsuranceProvider.create({ name: 'AXA Egypt' })]);

    const moduleRef = await Test.createTestingModule({
      controllers: [ReferenceDirectoryController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        { provide: JWT_SIGNER, useClass: FakeJwtSigner },
        { provide: MEDICAL_SPECIALTY_REPOSITORY, useValue: specialtyRepo },
        { provide: COUNTRY_REPOSITORY, useValue: countryRepo },
        { provide: INSURANCE_PROVIDER_REPOSITORY, useValue: insuranceRepo },
        {
          provide: ListMedicalSpecialtiesUseCase,
          useFactory: (repo: MedicalSpecialtyRepository) => new ListMedicalSpecialtiesUseCase(repo),
          inject: [MEDICAL_SPECIALTY_REPOSITORY],
        },
        {
          provide: ListCountriesUseCase,
          useFactory: (repo: CountryRepository) => new ListCountriesUseCase(repo),
          inject: [COUNTRY_REPOSITORY],
        },
        {
          provide: ListInsuranceProvidersUseCase,
          useFactory: (repo: InsuranceProviderRepository) => new ListInsuranceProvidersUseCase(repo),
          inject: [INSURANCE_PROVIDER_REPOSITORY],
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

  it('GET /reference/specialties rejects a request with no bearer token', async () => {
    await request(app.getHttpServer()).get('/reference/specialties').expect(401);
  });

  it('GET /reference/specialties is reachable by a plain Patient account', async () => {
    const response = await request(app.getHttpServer())
      .get('/reference/specialties')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].name, 'Cardiology');
  });

  it('GET /reference/countries is reachable by a plain Patient account', async () => {
    const response = await request(app.getHttpServer())
      .get('/reference/countries')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data[0].iso2Code, 'EG');
  });

  it('GET /reference/insurance-providers is reachable by a plain Patient account', async () => {
    const response = await request(app.getHttpServer())
      .get('/reference/insurance-providers')
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data[0].name, 'AXA Egypt');
  });
});
