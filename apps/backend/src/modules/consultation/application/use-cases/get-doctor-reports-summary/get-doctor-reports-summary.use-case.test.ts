import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';
import { GetDoctorRatingAggregateUseCase } from '../get-doctor-rating-aggregate/get-doctor-rating-aggregate.use-case.js';

import { GetDoctorReportsSummaryUseCase } from './get-doctor-reports-summary.use-case.js';

class FakeAppointmentRepository implements Partial<AppointmentRepository> {
  constructor(private readonly counts: Partial<Record<AppointmentStatus, number>>) {}
  async countByStatusForDoctor(): Promise<Partial<Record<AppointmentStatus, number>>> {
    return this.counts;
  }
}

class FakeConsultationFeedbackRepository {
  constructor(private readonly aggregate: DoctorRatingAggregate) {}
  async getRatingAggregateForDoctor(): Promise<DoctorRatingAggregate> {
    return this.aggregate;
  }
}

describe('GetDoctorReportsSummaryUseCase', () => {
  it('sums real per-status counts into a total and passes the rating aggregate straight through', async () => {
    const repository = new FakeAppointmentRepository({
      [AppointmentStatus.Confirmed]: 2,
      [AppointmentStatus.Completed]: 5,
      [AppointmentStatus.Cancelled]: 1,
      [AppointmentStatus.NoShow]: 1,
      [AppointmentStatus.Requested]: 3,
    });
    const ratingUseCase = new GetDoctorRatingAggregateUseCase(
      new FakeConsultationFeedbackRepository({ averageRating: 4.5, reviewCount: 10, writtenReviewCount: 6 }) as never,
    );
    const useCase = new GetDoctorReportsSummaryUseCase(repository as unknown as AppointmentRepository, ratingUseCase);

    const result = await useCase.execute({ doctorId: 'doctor-1' });

    assert.equal(result.confirmed, 2);
    assert.equal(result.completed, 5);
    assert.equal(result.cancelled, 1);
    assert.equal(result.noShow, 1);
    // totalAppointments sums every status returned, including Requested,
    // which has no dedicated field of its own.
    assert.equal(result.totalAppointments, 12);
    assert.equal(result.averageRating, 4.5);
    assert.equal(result.reviewCount, 10);
  });

  it('defaults every count to zero and keeps an honest null rating when nothing exists yet', async () => {
    const repository = new FakeAppointmentRepository({});
    const ratingUseCase = new GetDoctorRatingAggregateUseCase(
      new FakeConsultationFeedbackRepository({ averageRating: null, reviewCount: 0, writtenReviewCount: 0 }) as never,
    );
    const useCase = new GetDoctorReportsSummaryUseCase(repository as unknown as AppointmentRepository, ratingUseCase);

    const result = await useCase.execute({ doctorId: 'doctor-1' });

    assert.equal(result.totalAppointments, 0);
    assert.equal(result.confirmed, 0);
    assert.equal(result.completed, 0);
    assert.equal(result.cancelled, 0);
    assert.equal(result.noShow, 0);
    assert.equal(result.averageRating, null);
    assert.equal(result.reviewCount, 0);
  });
});
