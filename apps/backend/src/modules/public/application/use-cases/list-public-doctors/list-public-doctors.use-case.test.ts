import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetDoctorRatingAggregatesUseCase } from '../../../../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import type { ConsultationFeedback } from '../../../../consultation/domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../../consultation/domain/repositories/consultation-feedback.repository.js';
import { ProfessionalRank } from '../../../../doctor/domain/enums/professional-rank.enum.js';
import type { PublicDirectoryQueryPort, PublicDoctorEntry, PublicDoctorFilter, PublicDoctorResult } from '../../ports/public-directory-query.port.js';

import { ListPublicDoctorsQuery } from './list-public-doctors.query.js';
import { ListPublicDoctorsUseCase } from './list-public-doctors.use-case.js';

class FakePublicDirectoryQueryPort implements PublicDirectoryQueryPort {
  constructor(private readonly result: PublicDoctorResult) {}
  lastFilter: PublicDoctorFilter | undefined;
  async countDoctorsBySpecialty(): Promise<never> {
    throw new Error('not used by this test');
  }
  async searchDoctors(filter: PublicDoctorFilter): Promise<PublicDoctorResult> {
    this.lastFilter = filter;
    return this.result;
  }
}

class FakeConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  constructor(private readonly aggregates: Map<string, DoctorRatingAggregate>) {}
  async findByConsultationSessionId(): Promise<ConsultationFeedback | null> {
    return null;
  }
  async listForDoctor(): Promise<{ feedback: ConsultationFeedback[]; total: number }> {
    return { feedback: [], total: 0 };
  }
  async getRatingAggregateForDoctor(): Promise<DoctorRatingAggregate> {
    return { averageRating: null, reviewCount: 0 };
  }
  async getRatingAggregatesForDoctors(doctorIds: string[]): Promise<Map<string, DoctorRatingAggregate>> {
    const result = new Map<string, DoctorRatingAggregate>();
    for (const id of doctorIds) {
      const aggregate = this.aggregates.get(id);
      if (aggregate) result.set(id, aggregate);
    }
    return result;
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
}

function buildEntry(overrides: Partial<PublicDoctorEntry>): PublicDoctorEntry {
  return {
    doctorProfileId: '11111111-1111-4111-8111-111111111111',
    fullName: 'Dr. Ada Lovelace',
    specialtyId: '22222222-2222-4222-8222-222222222222',
    specialtyName: 'Cardiology',
    ...overrides,
  };
}

describe('ListPublicDoctorsUseCase', () => {
  it('converts page/limit to offset and forwards the specialtyId filter', async () => {
    const queryPort = new FakePublicDirectoryQueryPort({ entries: [], total: 0 });
    const useCase = new ListPublicDoctorsUseCase(
      queryPort,
      new GetDoctorRatingAggregatesUseCase(new FakeConsultationFeedbackRepository(new Map())),
    );

    await useCase.execute(new ListPublicDoctorsQuery({ page: 3, limit: 10, specialtyId: 'spec-1' }));

    assert.deepEqual(queryPort.lastFilter, { specialtyId: 'spec-1', limit: 10, offset: 20 });
  });

  it('joins real rating aggregates onto each doctor and sorts highest-rated first', async () => {
    const doctorA = buildEntry({ doctorProfileId: 'doctor-a', fullName: 'Dr. A', professionalRank: ProfessionalRank.Consultant });
    const doctorB = buildEntry({ doctorProfileId: 'doctor-b', fullName: 'Dr. B' });
    const doctorC = buildEntry({ doctorProfileId: 'doctor-c', fullName: 'Dr. C' });

    const queryPort = new FakePublicDirectoryQueryPort({ entries: [doctorA, doctorB, doctorC], total: 3 });
    const aggregates = new Map<string, DoctorRatingAggregate>([
      ['doctor-a', { averageRating: 4.2, reviewCount: 10 }],
      ['doctor-b', { averageRating: 4.8, reviewCount: 3 }],
      // doctor-c has no reviews at all -- absent from the map entirely.
    ]);

    const useCase = new ListPublicDoctorsUseCase(
      queryPort,
      new GetDoctorRatingAggregatesUseCase(new FakeConsultationFeedbackRepository(aggregates)),
    );

    const result = await useCase.execute(new ListPublicDoctorsQuery({ page: 1, limit: 20 }));

    assert.equal(result.total, 3);
    assert.deepEqual(
      result.doctors.map((d) => d.doctorProfileId),
      ['doctor-b', 'doctor-a', 'doctor-c'],
    );
    assert.equal(result.doctors[0].averageRating, 4.8);
    assert.equal(result.doctors[2].averageRating, null);
    assert.equal(result.doctors[2].reviewCount, 0);
    assert.equal(result.doctors[1].professionalRank, ProfessionalRank.Consultant);
  });
});
