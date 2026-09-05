import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Appointment } from '../../../domain/entities/appointment.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';

import { ListAppointmentsForPatientUseCase } from './list-appointments-for-patient.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
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
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
}

describe('ListAppointmentsForPatientUseCase', () => {
  it('returns only the appointments belonging to the given patient', async () => {
    const patientId = '11111111-1111-4111-8111-111111111111';
    const otherPatientId = '44444444-4444-4444-8444-444444444444';
    const mine = buildAppointment(patientId);
    const theirs = buildAppointment(otherPatientId);
    const useCase = new ListAppointmentsForPatientUseCase(new FakeAppointmentRepository([mine, theirs]));

    const result = await useCase.execute({ patientId });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.getId(), mine.getId());
  });

  it('returns an empty array (not a thrown error) when the patient has no appointments', async () => {
    const useCase = new ListAppointmentsForPatientUseCase(new FakeAppointmentRepository([]));

    const result = await useCase.execute({ patientId: '99999999-9999-4999-8999-999999999999' });

    assert.deepEqual(result, []);
  });
});
