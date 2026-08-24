import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ConsultationFeedback } from '../../../../consultation/domain/entities/consultation-feedback.entity.js';
import type { AppointmentRepository } from '../../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../../consultation/domain/repositories/consultation-feedback.repository.js';
import { GetDoctorBookingCountsUseCase } from '../../../../consultation/application/use-cases/get-doctor-booking-counts/get-doctor-booking-counts.use-case.js';
import { GetDoctorRatingAggregatesUseCase } from '../../../../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import { ProfessionalRank } from '../../../../doctor/domain/enums/professional-rank.enum.js';
import type { Holiday } from '../../../../scheduling/domain/entities/holiday.entity.js';
import type { ScheduleException } from '../../../../scheduling/domain/entities/schedule-exception.entity.js';
import type { WorkingHoursDay } from '../../../../scheduling/domain/entities/working-hours-day.entity.js';
import type { HolidayRepository } from '../../../../scheduling/domain/repositories/holiday.repository.js';
import type { ScheduleExceptionRepository } from '../../../../scheduling/domain/repositories/schedule-exception.repository.js';
import type { WorkingHoursRepository } from '../../../../scheduling/domain/repositories/working-hours.repository.js';
import { GetDoctorsOpenOnDatesUseCase } from '../../../../scheduling/application/use-cases/get-doctors-open-on-dates/get-doctors-open-on-dates.use-case.js';
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
    return { averageRating: null, reviewCount: 0, writtenReviewCount: 0 };
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

class FakeAppointmentRepository implements Partial<AppointmentRepository> {
  constructor(private readonly counts: Map<string, number> = new Map()) {}
  async countByDoctorIds(doctorIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const id of doctorIds) {
      const count = this.counts.get(id);
      if (count !== undefined) result.set(id, count);
    }
    return result;
  }
}

class FakeWorkingHoursRepository implements Partial<WorkingHoursRepository> {
  async findByDoctorIds(): Promise<Map<string, WorkingHoursDay[]>> {
    return new Map();
  }
}

class FakeScheduleExceptionRepository implements Partial<ScheduleExceptionRepository> {
  async findByDoctorIdsAndDates(): Promise<ScheduleException[]> {
    return [];
  }
}

class FakeHolidayRepository implements Partial<HolidayRepository> {
  async findAll(): Promise<Holiday[]> {
    return [];
  }
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

function buildUseCase(
  queryPort: PublicDirectoryQueryPort,
  aggregates: Map<string, DoctorRatingAggregate> = new Map(),
  bookingCounts: Map<string, number> = new Map(),
): ListPublicDoctorsUseCase {
  return new ListPublicDoctorsUseCase(
    queryPort,
    new GetDoctorRatingAggregatesUseCase(new FakeConsultationFeedbackRepository(aggregates)),
    new GetDoctorBookingCountsUseCase(new FakeAppointmentRepository(bookingCounts) as unknown as AppointmentRepository),
    new GetDoctorsOpenOnDatesUseCase(
      new FakeWorkingHoursRepository() as unknown as WorkingHoursRepository,
      new FakeScheduleExceptionRepository() as unknown as ScheduleExceptionRepository,
      new FakeHolidayRepository() as unknown as HolidayRepository,
    ),
  );
}

describe('ListPublicDoctorsUseCase', () => {
  it('converts page/limit to offset and forwards the specialtyId filter', async () => {
    const queryPort = new FakePublicDirectoryQueryPort({ entries: [], total: 0 });
    const useCase = buildUseCase(queryPort);

    await useCase.execute(new ListPublicDoctorsQuery({ page: 3, limit: 10, specialtyId: 'spec-1' }));

    assert.deepEqual(queryPort.lastFilter, { specialtyId: 'spec-1', limit: 10, offset: 20 });
  });

  it('joins real rating aggregates onto each doctor and sorts highest-rated first', async () => {
    const doctorA = buildEntry({ doctorProfileId: 'doctor-a', fullName: 'Dr. A', professionalRank: ProfessionalRank.Consultant });
    const doctorB = buildEntry({ doctorProfileId: 'doctor-b', fullName: 'Dr. B' });
    const doctorC = buildEntry({ doctorProfileId: 'doctor-c', fullName: 'Dr. C' });

    const queryPort = new FakePublicDirectoryQueryPort({ entries: [doctorA, doctorB, doctorC], total: 3 });
    const aggregates = new Map<string, DoctorRatingAggregate>([
      ['doctor-a', { averageRating: 4.2, reviewCount: 10, writtenReviewCount: 6 }],
      ['doctor-b', { averageRating: 4.8, reviewCount: 3, writtenReviewCount: 2 }],
      // doctor-c has no reviews at all -- absent from the map entirely.
    ]);

    const useCase = buildUseCase(queryPort, aggregates);

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

  it('tags the highest-rated reviewed doctor as top rated, never an unreviewed one', async () => {
    const doctorA = buildEntry({ doctorProfileId: 'doctor-a' });
    const doctorB = buildEntry({ doctorProfileId: 'doctor-b' });
    const queryPort = new FakePublicDirectoryQueryPort({ entries: [doctorA, doctorB], total: 2 });
    const aggregates = new Map<string, DoctorRatingAggregate>([['doctor-b', { averageRating: 4.9, reviewCount: 1, writtenReviewCount: 1 }]]);

    const useCase = buildUseCase(queryPort, aggregates);
    const result = await useCase.execute(new ListPublicDoctorsQuery({ page: 1, limit: 20 }));

    const topRated = result.doctors.find((d) => d.isTopRated);
    assert.equal(topRated?.doctorProfileId, 'doctor-b');
    assert.equal(result.doctors.find((d) => d.doctorProfileId === 'doctor-a')?.isTopRated, false);
  });

  it('tags the doctor with the most real bookings as most booked, never the same doctor already tagged top rated', async () => {
    const doctorA = buildEntry({ doctorProfileId: 'doctor-a' });
    const doctorB = buildEntry({ doctorProfileId: 'doctor-b' });
    const queryPort = new FakePublicDirectoryQueryPort({ entries: [doctorA, doctorB], total: 2 });
    const aggregates = new Map<string, DoctorRatingAggregate>([['doctor-a', { averageRating: 5, reviewCount: 1, writtenReviewCount: 1 }]]);
    const bookingCounts = new Map<string, number>([
      ['doctor-a', 50],
      ['doctor-b', 10],
    ]);

    const useCase = buildUseCase(queryPort, aggregates, bookingCounts);
    const result = await useCase.execute(new ListPublicDoctorsQuery({ page: 1, limit: 20 }));

    const doctorAResult = result.doctors.find((d) => d.doctorProfileId === 'doctor-a');
    const doctorBResult = result.doctors.find((d) => d.doctorProfileId === 'doctor-b');
    assert.equal(doctorAResult?.isTopRated, true);
    assert.equal(doctorAResult?.isMostBooked, false);
    assert.equal(doctorBResult?.isMostBooked, true);
  });

  it('never tags most-booked when nobody has any real bookings', async () => {
    const doctorA = buildEntry({ doctorProfileId: 'doctor-a' });
    const queryPort = new FakePublicDirectoryQueryPort({ entries: [doctorA], total: 1 });

    const useCase = buildUseCase(queryPort);
    const result = await useCase.execute(new ListPublicDoctorsQuery({ page: 1, limit: 20 }));

    assert.equal(result.doctors[0].isMostBooked, false);
  });

  it('carries yearsOfExperience and hospitalName straight through from the directory entry', async () => {
    const doctorA = buildEntry({ doctorProfileId: 'doctor-a', yearsOfExperience: 12, hospitalName: 'Cairo Medical Center' });
    const queryPort = new FakePublicDirectoryQueryPort({ entries: [doctorA], total: 1 });

    const useCase = buildUseCase(queryPort);
    const result = await useCase.execute(new ListPublicDoctorsQuery({ page: 1, limit: 20 }));

    assert.equal(result.doctors[0].yearsOfExperience, 12);
    assert.equal(result.doctors[0].hospitalName, 'Cairo Medical Center');
  });

  it('defaults availability to null when there is no open-on-dates signal', async () => {
    const doctorA = buildEntry({ doctorProfileId: 'doctor-a' });
    const queryPort = new FakePublicDirectoryQueryPort({ entries: [doctorA], total: 1 });

    const useCase = buildUseCase(queryPort);
    const result = await useCase.execute(new ListPublicDoctorsQuery({ page: 1, limit: 20 }));

    assert.equal(result.doctors[0].availability, null);
  });
});
