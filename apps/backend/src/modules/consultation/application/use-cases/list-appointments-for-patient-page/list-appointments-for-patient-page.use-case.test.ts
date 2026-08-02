import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import { ListAppointmentsForPatientPageUseCase } from './list-appointments-for-patient-page.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointments: Appointment[]) {}
  async findById(): Promise<Appointment | null> {
    return null;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getPatientId() === patientId);
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getDoctorId() === doctorId);
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async save(): Promise<void> {}
}

function buildAppointment(patientId: string): Appointment {
  return Appointment.request({
    patientId,
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    consultationType: ConsultationType.Free,
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
}

describe('ListAppointmentsForPatientPageUseCase', () => {
  it('returns only the appointments belonging to the given patient, with the true total', async () => {
    const patientId = '11111111-1111-4111-8111-111111111111';
    const otherPatientId = '44444444-4444-4444-8444-444444444444';
    const mine = buildAppointment(patientId);
    const theirs = buildAppointment(otherPatientId);
    const useCase = new ListAppointmentsForPatientPageUseCase(new FakeAppointmentRepository([mine, theirs]));

    const result = await useCase.execute({ patientId, page: 1, limit: 50 });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.getId(), mine.getId());
    assert.equal(result.total, 1);
  });

  it('returns an empty result (not a thrown error) when the patient has no appointments', async () => {
    const useCase = new ListAppointmentsForPatientPageUseCase(new FakeAppointmentRepository([]));

    const result = await useCase.execute({ patientId: '99999999-9999-4999-8999-999999999999', page: 1, limit: 50 });

    assert.deepEqual(result.items, []);
    assert.equal(result.total, 0);
  });

  it('scopes to a page window when page/limit are given', async () => {
    const patientId = '55555555-5555-4555-8555-555555555555';
    const appointments = Array.from({ length: 5 }, () => buildAppointment(patientId));
    const useCase = new ListAppointmentsForPatientPageUseCase(new FakeAppointmentRepository(appointments));

    const result = await useCase.execute({ patientId, page: 2, limit: 2 });

    assert.equal(result.items.length, 2);
    assert.equal(result.total, 5);
  });
});
