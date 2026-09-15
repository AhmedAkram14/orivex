import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import { AppointmentCancelledEvent } from '../events/appointment-cancelled.event.js';
import { AppointmentConfirmedEvent } from '../events/appointment-confirmed.event.js';
import { AppointmentDeclinedEvent } from '../events/appointment-declined.event.js';
import { AppointmentExpiredEvent } from '../events/appointment-expired.event.js';
import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';
import { ConsultationPricing } from '../value-objects/consultation-pricing.value-object.js';
import { Money } from '../value-objects/money.value-object.js';

import { Appointment } from './appointment.entity.js';

function requestAppointment(pricing: ConsultationPricing = ConsultationPricing.free()): Appointment {
  return Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    pricing,
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

  it('confirm() raises AppointmentConfirmedEvent carrying the appointment id -- the doctor-approval workflow\'s cue to notify the patient', () => {
    const appointment = requestAppointment();
    appointment.releaseDomainEvents(); // clears AppointmentBooked -- confirm() is a separate transaction (the doctor's later approval) in real usage

    appointment.confirm();

    const events = appointment.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof AppointmentConfirmedEvent);
    assert.equal((events[0] as AppointmentConfirmedEvent).appointmentId, appointment.getId());
  });

  it('rejects confirming a non-Requested appointment', () => {
    const appointment = requestAppointment();
    appointment.confirm();
    assert.throws(() => appointment.confirm(), ConsultationDomainError);
  });

  it('cancels a Requested or Confirmed appointment', () => {
    const appointment = requestAppointment();
    appointment.cancel('patient');
    assert.equal(appointment.getStatus(), AppointmentStatus.Cancelled);
  });

  it('rejects cancelling a terminal appointment', () => {
    const appointment = requestAppointment();
    appointment.cancel('patient');
    assert.throws(() => appointment.cancel('patient'), ConsultationDomainError);
  });

  it('cancel() raises AppointmentCancelledEvent carrying the appointment id and cancelledBy', () => {
    const appointment = requestAppointment();
    appointment.releaseDomainEvents(); // clears AppointmentBooked -- cancel() is a separate transaction in real usage

    appointment.cancel('doctor');

    const events = appointment.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof AppointmentCancelledEvent);
    assert.equal((events[0] as AppointmentCancelledEvent).appointmentId, appointment.getId());
    assert.equal((events[0] as AppointmentCancelledEvent).cancelledBy, 'doctor');
  });

  it('declines a Requested appointment', () => {
    const appointment = requestAppointment();
    appointment.decline('Not accepting new patients this week');
    assert.equal(appointment.getStatus(), AppointmentStatus.Cancelled);
  });

  it('declines a Requested PAID appointment too -- unlike approve(), decline is not restricted to Free-only pricing', () => {
    const appointment = requestAppointment(ConsultationPricing.paid(Money.create(500, 'EGP')));
    appointment.decline();
    assert.equal(appointment.getStatus(), AppointmentStatus.Cancelled);
  });

  it('decline() raises AppointmentDeclinedEvent carrying the appointment id and reason', () => {
    const appointment = requestAppointment();
    appointment.releaseDomainEvents(); // clears AppointmentBooked -- decline() is a separate transaction in real usage

    appointment.decline('Schedule conflict');

    const events = appointment.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof AppointmentDeclinedEvent);
    assert.equal((events[0] as AppointmentDeclinedEvent).appointmentId, appointment.getId());
    assert.equal((events[0] as AppointmentDeclinedEvent).reason, 'Schedule conflict');
  });

  it('decline() works without a reason -- it is optional', () => {
    const appointment = requestAppointment();
    appointment.releaseDomainEvents();

    appointment.decline();

    const events = appointment.releaseDomainEvents();
    assert.equal((events[0] as AppointmentDeclinedEvent).reason, undefined);
  });

  it('rejects declining a non-Requested appointment', () => {
    const appointment = requestAppointment();
    appointment.confirm();
    assert.throws(() => appointment.decline(), ConsultationDomainError);
  });

  it('rejects declining an already-cancelled appointment', () => {
    const appointment = requestAppointment();
    appointment.cancel('doctor');
    assert.throws(() => appointment.decline(), ConsultationDomainError);
  });

  it('expires a Requested appointment', () => {
    const appointment = requestAppointment();
    appointment.expire();
    assert.equal(appointment.getStatus(), AppointmentStatus.Expired);
  });

  it('expire() raises AppointmentExpiredEvent carrying the appointment id', () => {
    const appointment = requestAppointment();
    appointment.releaseDomainEvents(); // clears AppointmentBooked -- expire() is a separate transaction (the system sweep) in real usage

    appointment.expire();

    const events = appointment.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof AppointmentExpiredEvent);
    assert.equal((events[0] as AppointmentExpiredEvent).appointmentId, appointment.getId());
  });

  it('rejects expiring a non-Requested appointment', () => {
    const appointment = requestAppointment();
    appointment.confirm();
    assert.throws(() => appointment.expire(), ConsultationDomainError);
  });

  it('rejects expiring an already-cancelled appointment', () => {
    const appointment = requestAppointment();
    appointment.cancel('doctor');
    assert.throws(() => appointment.expire(), ConsultationDomainError);
  });

  it('rejects expiring an already-expired appointment', () => {
    const appointment = requestAppointment();
    appointment.expire();
    assert.throws(() => appointment.expire(), ConsultationDomainError);
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
