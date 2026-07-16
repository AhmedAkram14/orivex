import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import { GetAppointmentByIdUseCase } from './get-appointment-by-id.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async save(): Promise<void> {}
}

describe('GetAppointmentByIdUseCase', () => {
  it('returns the appointment when it exists', async () => {
    const appointment = Appointment.request({
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    const useCase = new GetAppointmentByIdUseCase(new FakeAppointmentRepository(appointment));

    const result = await useCase.execute({ appointmentId: appointment.getId() });

    assert.equal(result?.getId(), appointment.getId());
  });

  it('returns null (not a thrown error) when the appointment does not exist', async () => {
    const useCase = new GetAppointmentByIdUseCase(new FakeAppointmentRepository(null));

    const result = await useCase.execute({ appointmentId: '99999999-9999-4999-8999-999999999999' });

    assert.equal(result, null);
  });
});
