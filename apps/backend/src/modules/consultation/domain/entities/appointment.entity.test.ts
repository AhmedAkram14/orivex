import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import { ConsultationType } from '../enums/consultation-type.enum.js';
import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

import { Appointment } from './appointment.entity.js';

function requestAppointment(): Appointment {
  return Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    consultationType: ConsultationType.Free,
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
}

describe('Appointment', () => {
  it('requests a new appointment and records AppointmentBooked', () => {
    const appointment = requestAppointment();

    assert.equal(appointment.getStatus(), AppointmentStatus.Requested);
    assert.equal(appointment.releaseDomainEvents().length, 1);
  });

  it('confirms a Requested appointment', () => {
    const appointment = requestAppointment();
    appointment.confirm();
    assert.equal(appointment.getStatus(), AppointmentStatus.Confirmed);
  });

  it('rejects confirming a non-Requested appointment', () => {
    const appointment = requestAppointment();
    appointment.confirm();
    assert.throws(() => appointment.confirm(), ConsultationDomainError);
  });

  it('cancels a Requested or Confirmed appointment', () => {
    const appointment = requestAppointment();
    appointment.cancel();
    assert.equal(appointment.getStatus(), AppointmentStatus.Cancelled);
  });

  it('rejects cancelling a terminal appointment', () => {
    const appointment = requestAppointment();
    appointment.cancel();
    assert.throws(() => appointment.cancel(), ConsultationDomainError);
  });

  it('marks an appointment as Rescheduled', () => {
    const appointment = requestAppointment();
    appointment.markRescheduled();
    assert.equal(appointment.getStatus(), AppointmentStatus.Rescheduled);
  });

  it('completes a Confirmed appointment', () => {
    const appointment = requestAppointment();
    appointment.confirm();
    appointment.complete();
    assert.equal(appointment.getStatus(), AppointmentStatus.Completed);
  });

  it('rejects completing a non-Confirmed appointment', () => {
    const appointment = requestAppointment();
    assert.throws(() => appointment.complete(), ConsultationDomainError);
  });
});
