import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import { GetDoctorBookingCountsUseCase } from './get-doctor-booking-counts.use-case.js';

class FakeAppointmentRepository implements Partial<AppointmentRepository> {
  public lastDoctorIds?: string[];
  public lastStatuses?: AppointmentStatus[];
  constructor(private readonly counts: Map<string, number>) {}
  async countByDoctorIds(doctorIds: string[], statuses: AppointmentStatus[]): Promise<Map<string, number>> {
    this.lastDoctorIds = doctorIds;
    this.lastStatuses = statuses;
    return this.counts;
  }
}

describe('GetDoctorBookingCountsUseCase', () => {
  it('delegates to the repository with the requested doctor ids and only real (confirmed/completed) statuses', async () => {
    const repository = new FakeAppointmentRepository(new Map([['doctor-1', 5]]));
    const useCase = new GetDoctorBookingCountsUseCase(repository as unknown as AppointmentRepository);

    const result = await useCase.execute({ doctorIds: ['doctor-1', 'doctor-2'] });

    assert.equal(result.get('doctor-1'), 5);
    assert.deepEqual(repository.lastDoctorIds, ['doctor-1', 'doctor-2']);
    assert.deepEqual(repository.lastStatuses, [AppointmentStatus.Confirmed, AppointmentStatus.Completed]);
  });
});
