import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type {
  ConsultationFeedbackRepository,
  DoctorRatingAggregate,
} from '../../../domain/repositories/consultation-feedback.repository.js';

import { GetDoctorReportsAnalyticsUseCase } from './get-doctor-reports-analytics.use-case.js';

const EMPTY_RATING: DoctorRatingAggregate = {
  averageRating: null,
  reviewCount: 0,
  writtenReviewCount: 0,
  averageCommunicationRating: null,
  averagePunctualityRating: null,
  averageThoroughnessRating: null,
};

class FakeAppointmentRepository implements Partial<AppointmentRepository> {
  public bucketedCalls: Array<{ from: Date; to: Date; bucket: 'day' | 'week' | 'month' }> = [];

  constructor(
    private readonly counts: Partial<Record<AppointmentStatus, number>>,
    private readonly pendingApproval: number,
    private readonly previousCounts: Partial<Record<AppointmentStatus, number>> = {},
  ) {}

  async countByStatusForDoctorInRange(
    _doctorId: string,
    from: Date,
    _to: Date,
  ): Promise<Partial<Record<AppointmentStatus, number>>> {
    // Distinguish the "current window" call from the "previous window" call
    // by the caller-supplied `from` -- the test cases below always use a
    // distinct previous window start.
    return from.getTime() === PREVIOUS_FROM.getTime() ? this.previousCounts : this.counts;
  }

  async countFreeRequestedForDoctorInRange(): Promise<number> {
    return this.pendingApproval;
  }

  async countByDoctorIdBucketed(
    _doctorId: string,
    from: Date,
    to: Date,
    bucket: 'day' | 'week' | 'month',
  ): Promise<{ bucket: string; count: number }[]> {
    this.bucketedCalls.push({ from, to, bucket });
    return [];
  }
}

class FakeConsultationFeedbackRepository implements Partial<ConsultationFeedbackRepository> {
  constructor(private readonly aggregate: DoctorRatingAggregate) {}
  async getRatingAggregateForDoctorInRange(): Promise<DoctorRatingAggregate> {
    return this.aggregate;
  }
}

// Matches resolvePreviousWindow's output for the previousPeriod test below:
// dateFrom 2026-01-01 minus the 7-day window width (dateTo 2026-01-08).
const PREVIOUS_FROM = new Date('2025-12-25T00:00:00Z');

function makeUseCase(
  counts: Partial<Record<AppointmentStatus, number>>,
  pendingApproval: number,
  rating: DoctorRatingAggregate = EMPTY_RATING,
  previousCounts: Partial<Record<AppointmentStatus, number>> = {},
): { useCase: GetDoctorReportsAnalyticsUseCase; appointmentRepository: FakeAppointmentRepository } {
  const appointmentRepository = new FakeAppointmentRepository(counts, pendingApproval, previousCounts);
  const feedbackRepository = new FakeConsultationFeedbackRepository(rating);
  const useCase = new GetDoctorReportsAnalyticsUseCase(
    appointmentRepository as unknown as AppointmentRepository,
    feedbackRepository as unknown as ConsultationFeedbackRepository,
  );
  return { useCase, appointmentRepository };
}

describe('GetDoctorReportsAnalyticsUseCase', () => {
  it('reconciles every tile against the real total across all 7 statuses', async () => {
    const counts: Partial<Record<AppointmentStatus, number>> = {
      [AppointmentStatus.Requested]: 5, // 2 free-pending, 3 paid-unconfirmed
      [AppointmentStatus.Confirmed]: 4,
      [AppointmentStatus.Rescheduled]: 1,
      [AppointmentStatus.Cancelled]: 3,
      [AppointmentStatus.NoShow]: 2,
      [AppointmentStatus.Completed]: 10,
      [AppointmentStatus.Expired]: 1,
    };
    const { useCase } = makeUseCase(counts, 2);

    const result = await useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-31T00:00:00Z'),
    });

    // totalAppointments = 5+4+1+3+2+10+1 = 26
    assert.equal(result.totalAppointments, 26);
    assert.equal(result.completed, 10);
    assert.equal(result.cancelled, 3);
    assert.equal(result.noShow, 2);
    assert.equal(result.pendingApproval, 2);
    // upcoming = confirmed(4) + rescheduled(1) + paidUnconfirmedRequested(5-2=3) = 8
    assert.equal(result.upcoming, 8);
    assert.equal(result.expired, 1);

    assert.equal(
      result.completed + result.cancelled + result.noShow + result.pendingApproval + result.upcoming + result.expired,
      result.totalAppointments,
    );
  });

  it('folds the paid-unconfirmed Requested remainder into Upcoming, not Pending approval', async () => {
    const counts: Partial<Record<AppointmentStatus, number>> = {
      [AppointmentStatus.Requested]: 6,
      [AppointmentStatus.Confirmed]: 0,
      [AppointmentStatus.Rescheduled]: 0,
      [AppointmentStatus.Cancelled]: 0,
      [AppointmentStatus.NoShow]: 0,
      [AppointmentStatus.Completed]: 0,
      [AppointmentStatus.Expired]: 0,
    };
    // 4 of the 6 Requested appointments are free-pending; the other 2 are
    // paid-but-unconfirmed and should land entirely in Upcoming.
    const { useCase } = makeUseCase(counts, 4);

    const result = await useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-08T00:00:00Z'),
    });

    assert.equal(result.pendingApproval, 4);
    assert.equal(result.upcoming, 2);
    assert.equal(result.totalAppointments, 6);
  });

  it('only computes previousPeriod when comparePrevious is true', async () => {
    const counts: Partial<Record<AppointmentStatus, number>> = {
      [AppointmentStatus.Completed]: 3,
      [AppointmentStatus.Cancelled]: 1,
    };
    const previousCounts: Partial<Record<AppointmentStatus, number>> = {
      [AppointmentStatus.Completed]: 5,
      [AppointmentStatus.Cancelled]: 2,
      [AppointmentStatus.NoShow]: 1,
    };
    const { useCase: withoutCompare } = makeUseCase(counts, 0, EMPTY_RATING, previousCounts);
    const dateFrom = new Date('2026-01-01T00:00:00Z');
    const dateTo = new Date('2026-01-08T00:00:00Z');

    const resultWithout = await withoutCompare.execute({ doctorId: 'doctor-1', dateFrom, dateTo });
    assert.equal(resultWithout.previousPeriod, undefined);

    const { useCase: withCompare } = makeUseCase(counts, 0, EMPTY_RATING, previousCounts);
    const resultWith = await withCompare.execute({
      doctorId: 'doctor-1',
      dateFrom,
      dateTo,
      comparePrevious: true,
    });
    assert.ok(resultWith.previousPeriod);
    assert.equal(resultWith.previousPeriod?.completed, 5);
    assert.equal(resultWith.previousPeriod?.cancelled, 2);
    assert.equal(resultWith.previousPeriod?.noShow, 1);
    assert.equal(resultWith.previousPeriod?.totalAppointments, 8);
  });

  it('picks day/week/month bucket sizes from the range span', async () => {
    const shortRange = makeUseCase({}, 0);
    await shortRange.useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-15T00:00:00Z'), // 14 days
    });
    assert.equal(shortRange.appointmentRepository.bucketedCalls[0]?.bucket, 'day');

    const mediumRange = makeUseCase({}, 0);
    await mediumRange.useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-04-01T00:00:00Z'), // ~90 days
    });
    assert.equal(mediumRange.appointmentRepository.bucketedCalls[0]?.bucket, 'week');

    const longRange = makeUseCase({}, 0);
    await longRange.useCase.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2025-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-01T00:00:00Z'), // 365 days
    });
    assert.equal(longRange.appointmentRepository.bucketedCalls[0]?.bucket, 'month');
  });

  it('returns the raw rating average/count unthresholded even at 0 or 1 reviews', async () => {
    const oneReview: DoctorRatingAggregate = { ...EMPTY_RATING, averageRating: 5, reviewCount: 1 };
    const { useCase: withOneReview } = makeUseCase({}, 0, oneReview);
    const result1 = await withOneReview.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-08T00:00:00Z'),
    });
    assert.equal(result1.averageRating, 5);
    assert.equal(result1.reviewCount, 1);

    const { useCase: withNoReviews } = makeUseCase({}, 0, EMPTY_RATING);
    const result0 = await withNoReviews.execute({
      doctorId: 'doctor-1',
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-01-08T00:00:00Z'),
    });
    assert.equal(result0.averageRating, null);
    assert.equal(result0.reviewCount, 0);
  });

  it('throws if pendingApproval somehow exceeds the real Requested count (invariant guard)', async () => {
    const counts: Partial<Record<AppointmentStatus, number>> = {
      [AppointmentStatus.Requested]: 1,
    };
    const { useCase } = makeUseCase(counts, 5);

    await assert.rejects(
      () =>
        useCase.execute({
          doctorId: 'doctor-1',
          dateFrom: new Date('2026-01-01T00:00:00Z'),
          dateTo: new Date('2026-01-08T00:00:00Z'),
        }),
      /pendingApproval/,
    );
  });
});
