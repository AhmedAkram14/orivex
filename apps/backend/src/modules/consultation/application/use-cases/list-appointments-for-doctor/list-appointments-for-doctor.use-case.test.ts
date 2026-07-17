import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import { ListAppointmentsForDoctorUseCase } from './list-appointments-for-doctor.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointments: Appointment[]) {}
  async findById(): Promise<Appointment | null> {
    return null;
  }
  async findByPatientId(): Promise<Appointment[]> {
    return [];
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getDoctorId() === doctorId);
  }
  async save(): Promise<void> {}
}

function buildAppointment(doctorId: string): Appointment {
  return Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId,
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    consultationType: ConsultationType.Free,
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
}

describe('ListAppointmentsForDoctorUseCase', () => {
  it('returns only the appointments belonging to the given doctor', async () => {
    const doctorId = '22222222-2222-4222-8222-222222222222';
    const otherDoctorId = '55555555-5555-4555-8555-555555555555';
    const mine = buildAppointment(doctorId);
    const theirs = buildAppointment(otherDoctorId);
    const useCase = new ListAppointmentsForDoctorUseCase(new FakeAppointmentRepository([mine, theirs]));

    const result = await useCase.execute({ doctorId });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.getId(), mine.getId());
  });

  it('returns an empty array (not a thrown error) when the doctor has no appointments', async () => {
    const useCase = new ListAppointmentsForDoctorUseCase(new FakeAppointmentRepository([]));

    const result = await useCase.execute({ doctorId: '99999999-9999-4999-8999-999999999999' });

    assert.deepEqual(result, []);
  });
});
