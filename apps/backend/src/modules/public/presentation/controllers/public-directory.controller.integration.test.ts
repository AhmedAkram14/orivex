import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { GetDoctorRatingAggregatesUseCase } from '../../../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import type { ConsultationFeedback } from '../../../consultation/domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../consultation/domain/repositories/consultation-feedback.repository.js';
import { ProfessionalRank } from '../../../doctor/domain/enums/professional-rank.enum.js';
import { ListMedicalSpecialtiesUseCase } from '../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { MedicalSpecialty } from '../../../reference/domain/entities/medical-specialty.entity.js';
import type { MedicalSpecialtyRepository } from '../../../reference/domain/repositories/medical-specialty.repository.js';
import { PUBLIC_DIRECTORY_QUERY_PORT } from '../../application/ports/tokens.js';
import type { PublicDirectoryQueryPort, PublicDoctorResult, PublicSpecialtyCount } from '../../application/ports/public-directory-query.port.js';
import { ListPublicDoctorsUseCase } from '../../application/use-cases/list-public-doctors/list-public-doctors.use-case.js';
import { ListPublicSpecialtiesUseCase } from '../../application/use-cases/list-public-specialties/list-public-specialties.use-case.js';

import { PublicDoctorsController } from './public-doctors.controller.js';
import { PublicSpecialtiesController } from './public-specialties.controller.js';

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

class FakePublicDirectoryQueryPort implements PublicDirectoryQueryPort {
  constructor(
    private readonly counts: PublicSpecialtyCount[],
    private readonly doctorResult: PublicDoctorResult,
  ) {}
  async countDoctorsBySpecialty(): Promise<PublicSpecialtyCount[]> {
    return this.counts;
  }
  async searchDoctors(): Promise<PublicDoctorResult> {
    return this.doctorResult;
  }
}

class FakeConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  async findByConsultationSessionId(): Promise<ConsultationFeedback | null> {
    return null;
  }
  async listForDoctor(): Promise<{ feedback: ConsultationFeedback[]; total: number }> {
    return { feedback: [], total: 0 };
  }
  async getRatingAggregateForDoctor(): Promise<DoctorRatingAggregate> {
    return { averageRating: null, reviewCount: 0 };
  }
  async getRatingAggregatesForDoctors(): Promise<Map<string, DoctorRatingAggregate>> {
    return new Map([['doctor-1', { averageRating: 4.5, reviewCount: 12 }]]);
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
}

// Public Landing Page (2026-07-29): confirms both routes are reachable by a
// completely anonymous caller -- no Authorization header at all, unlike
// every other directory-style endpoint in the codebase (GET /doctors,
// GET /reference/specialties). Same no-guard precedent as
// GET /doctors/:id/reviews.
describe('Public directory controllers (integration)', () => {
  let app: INestApplication;
  let cardiologyId: string;

  before(async () => {
    const cardiology = MedicalSpecialty.create({ name: 'Cardiology' });
    cardiologyId = cardiology.getId();
    const specialtyRepo = new InMemoryMedicalSpecialtyRepository([cardiology]);

    const queryPort = new FakePublicDirectoryQueryPort(
      [{ specialtyId: cardiologyId, doctorCount: 3 }],
      {
        total: 1,
        entries: [
          {
            doctorProfileId: 'doctor-1',
            fullName: 'Dr. Ada Lovelace',
            professionalRank: ProfessionalRank.Consultant,
            specialtyId: cardiologyId,
            specialtyName: 'Cardiology',
            consultationFeeAmount: 500,
          },
        ],
      },
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [PublicSpecialtiesController, PublicDoctorsController],
      providers: [
        PinoLoggerService,
        { provide: PUBLIC_DIRECTORY_QUERY_PORT, useValue: queryPort },
        { provide: ListMedicalSpecialtiesUseCase, useValue: new ListMedicalSpecialtiesUseCase(specialtyRepo) },
        {
          provide: GetDoctorRatingAggregatesUseCase,
          useFactory: () => new GetDoctorRatingAggregatesUseCase(new FakeConsultationFeedbackRepository()),
        },
        {
          provide: ListPublicSpecialtiesUseCase,
          useFactory: (listMedicalSpecialtiesUseCase: ListMedicalSpecialtiesUseCase, port: PublicDirectoryQueryPort) =>
            new ListPublicSpecialtiesUseCase(listMedicalSpecialtiesUseCase, port),
          inject: [ListMedicalSpecialtiesUseCase, PUBLIC_DIRECTORY_QUERY_PORT],
        },
        {
          provide: ListPublicDoctorsUseCase,
          useFactory: (port: PublicDirectoryQueryPort, ratingsUseCase: GetDoctorRatingAggregatesUseCase) =>
            new ListPublicDoctorsUseCase(port, ratingsUseCase),
          inject: [PUBLIC_DIRECTORY_QUERY_PORT, GetDoctorRatingAggregatesUseCase],
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

  it('GET /public/specialties is reachable with no Authorization header and returns real doctor counts', async () => {
    const response = await request(app.getHttpServer()).get('/public/specialties').expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].name, 'Cardiology');
    assert.equal(response.body.data[0].doctorCount, 3);
  });

  it('GET /public/doctors is reachable with no Authorization header and returns a joined rating aggregate', async () => {
    const response = await request(app.getHttpServer())
      .get(`/public/doctors?specialtyId=${cardiologyId}`)
      .expect(200);

    assert.equal(response.body.data.doctors.length, 1);
    const doctor = response.body.data.doctors[0];
    assert.equal(doctor.fullName, 'Dr. Ada Lovelace');
    assert.equal(doctor.specialtyName, 'Cardiology');
    assert.equal(doctor.averageRating, 4.5);
    assert.equal(doctor.reviewCount, 12);
  });
});
