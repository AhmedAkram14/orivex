import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GetDoctorRatingAggregatesUseCase } from '../../../../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import type { DoctorActivityRow, DoctorAnalyticsQueryPort } from '../../ports/doctor-analytics-query.port.js';

import { GetDoctorAnalyticsUseCase } from './get-doctor-analytics.use-case.js';

function row(overrides: Partial<DoctorActivityRow> & { doctorId: string }): DoctorActivityRow {
  return {
    displayName: 'Dr. Test',
    specialtyId: null,
    completedConsultations: 0,
    upcomingAppointments: 0,
    cancelledCount: 0,
    totalAppointments: 0,
    averageSessionDurationMinutes: null,
    revenueGenerated: 0,
    patientCount: 0,
    ...overrides,
  };
}

class FakeDoctorAnalyticsQuery implements DoctorAnalyticsQueryPort {
  constructor(private readonly rows: DoctorActivityRow[]) {}
  async getActivity(): Promise<DoctorActivityRow[]> {
    return this.rows;
  }
}

function fakeRatings(map: Record<string, { averageRating: number | null; reviewCount: number }>): GetDoctorRatingAggregatesUseCase {
  return { execute: async () => new Map(Object.entries(map)) } as unknown as GetDoctorRatingAggregatesUseCase;
}

describe('GetDoctorAnalyticsUseCase', () => {
  it('computes cancellationRate as a zero-safe fraction and merges in rating aggregates', async () => {
    const query = new FakeDoctorAnalyticsQuery([row({ doctorId: 'd1', totalAppointments: 4, cancelledCount: 1 })]);
    const useCase = new GetDoctorAnalyticsUseCase(query, fakeRatings({ d1: { averageRating: 4.2, reviewCount: 6 } }));

    const result = await useCase.execute({}, {});

    assert.equal(result.entries[0].cancellationRate, 0.25);
    assert.equal(result.entries[0].averageRating, 4.2);
    assert.equal(result.entries[0].reviewCount, 6);
  });

  it('defaults cancellationRate to 0 and rating to null when a doctor has no appointments or reviews yet', async () => {
    const query = new FakeDoctorAnalyticsQuery([row({ doctorId: 'd1', totalAppointments: 0 })]);
    const useCase = new GetDoctorAnalyticsUseCase(query, fakeRatings({}));

    const result = await useCase.execute({}, {});

    assert.equal(result.entries[0].cancellationRate, 0);
    assert.equal(result.entries[0].averageRating, null);
    assert.equal(result.entries[0].reviewCount, 0);
  });

  it('sorts the Top Doctors leaderboard by revenue by default', async () => {
    const query = new FakeDoctorAnalyticsQuery([
      row({ doctorId: 'low', revenueGenerated: 100 }),
      row({ doctorId: 'high', revenueGenerated: 900 }),
    ]);
    const useCase = new GetDoctorAnalyticsUseCase(query, fakeRatings({}));

    const result = await useCase.execute({}, {});

    assert.deepEqual(result.entries.map((entry) => entry.doctorId), ['high', 'low']);
  });

  it('sorts by rating when sortBy=rating, treating an unrated doctor as lowest', async () => {
    const query = new FakeDoctorAnalyticsQuery([row({ doctorId: 'unrated' }), row({ doctorId: 'rated' })]);
    const useCase = new GetDoctorAnalyticsUseCase(query, fakeRatings({ rated: { averageRating: 4.9, reviewCount: 2 } }));

    const result = await useCase.execute({}, { sortBy: 'rating' });

    assert.deepEqual(result.entries.map((entry) => entry.doctorId), ['rated', 'unrated']);
  });

  it('honors limit while total still reflects the full unfiltered count', async () => {
    const query = new FakeDoctorAnalyticsQuery([row({ doctorId: 'a' }), row({ doctorId: 'b' }), row({ doctorId: 'c' })]);
    const useCase = new GetDoctorAnalyticsUseCase(query, fakeRatings({}));

    const result = await useCase.execute({}, { limit: 2 });

    assert.equal(result.entries.length, 2);
    assert.equal(result.total, 3);
  });
});
