import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ReleaseAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import { ConsultationPricing as DoctorConsultationPricing } from '../../../../doctor/domain/value-objects/consultation-pricing.value-object.js';
import { Money as DoctorMoney } from '../../../../doctor/domain/value-objects/money.value-object.js';
import { ReleaseSlotUseCase } from '../../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import { AppointmentDeclinedEvent } from '../../../domain/events/appointment-declined.event.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';
import { Money } from '../../../domain/value-objects/money.value-object.js';

import { DeclineAppointmentCommand } from './decline-appointment.command.js';
import { DeclineAppointmentUseCase } from './decline-appointment.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
  }
  public readonly saved: Appointment[] = [];
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
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
  async save(appointment: Appointment): Promise<void> {
    this.saved.push(appointment);
  }
}

class InMemoryAvailabilityWindowRepository implements AvailabilityWindowRepository {
  private readonly byId = new Map<string, AvailabilityWindow>();
  seed(window: AvailabilityWindow): void {
    this.byId.set(window.getId(), window);
  }
  async findById(id: string): Promise<AvailabilityWindow | null> {
    return this.byId.get(id) ?? null;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async findByDoctorAndRange(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(window: AvailabilityWindow): Promise<void> {
    this.byId.set(window.getId(), window);
  }
  async deleteById(id: string): Promise<void> {
    this.byId.delete(id);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

class RecordingDispatcher {
  public readonly dispatched: unknown[] = [];
  async dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

function buildRequestedAppointment(
  consultationPricing: ConsultationPricing = ConsultationPricing.free(),
  doctorPricing: DoctorConsultationPricing = DoctorConsultationPricing.free(),
): { appointment: Appointment; window: AvailabilityWindow } {
  const startTime = new Date(Date.now() + 60 * 60_000);
  const window = AvailabilityWindow.define({
    doctorId: '22222222-2222-4222-8222-222222222222',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    pricing: doctorPricing,
  });
  window.hold();
  const appointment = Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: window.getId(),
    pricing: consultationPricing,
    scheduledAt: startTime,
  });
  appointment.releaseDomainEvents(); // clears AppointmentBooked -- decline() is a separate transaction in real usage
  return { appointment, window };
}

describe('DeclineAppointmentUseCase', () => {
  it('declines the appointment and releases the held slot', async () => {
    const { appointment, window } = buildRequestedAppointment();
    const appointmentRepo = new FakeAppointmentRepository(appointment);
    const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository();
    availabilityWindowRepo.seed(window);
    const releaseSlotUseCase = new ReleaseSlotUseCase(
      new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher()),
    );
    const dispatcher = new RecordingDispatcher();
    const useCase = new DeclineAppointmentUseCase(appointmentRepo, releaseSlotUseCase, dispatcher);

    const result = await useCase.execute(
      new DeclineAppointmentCommand({ appointmentId: appointment.getId(), reason: 'Too far out' }),
    );

    assert.equal(result.getStatus(), AppointmentStatus.Cancelled);
    assert.equal(appointmentRepo.saved.length, 1);
    const savedWindow = await availabilityWindowRepo.findById(window.getId());
    assert.equal(savedWindow?.getStatus(), 'open');
    assert.equal(dispatcher.dispatched.length, 1);
    assert.ok(dispatcher.dispatched[0] instanceof AppointmentDeclinedEvent);
    assert.equal((dispatcher.dispatched[0] as AppointmentDeclinedEvent).reason, 'Too far out');
  });

  it('declines a PAID appointment too -- decline is not restricted to Free-only pricing, unlike approve', async () => {
    const { appointment, window } = buildRequestedAppointment(
      ConsultationPricing.paid(Money.create(500, 'EGP')),
      DoctorConsultationPricing.paid(DoctorMoney.create(500, 'EGP')),
    );
    const appointmentRepo = new FakeAppointmentRepository(appointment);
    const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository();
    availabilityWindowRepo.seed(window);
    const releaseSlotUseCase = new ReleaseSlotUseCase(
      new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher()),
    );
    const useCase = new DeclineAppointmentUseCase(appointmentRepo, releaseSlotUseCase, new NoopDispatcher());

    const result = await useCase.execute(new DeclineAppointmentCommand({ appointmentId: appointment.getId() }));

    assert.equal(result.getStatus(), AppointmentStatus.Cancelled);
  });

  it('rejects declining a non-Requested appointment and never saves/releases anything', async () => {
    const { appointment, window } = buildRequestedAppointment();
    appointment.confirm();
    appointment.releaseDomainEvents();
    const appointmentRepo = new FakeAppointmentRepository(appointment);
    const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository();
    availabilityWindowRepo.seed(window);
    const releaseSlotUseCase = new ReleaseSlotUseCase(
      new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher()),
    );
    const useCase = new DeclineAppointmentUseCase(appointmentRepo, releaseSlotUseCase, new NoopDispatcher());

    await assert.rejects(
      () => useCase.execute(new DeclineAppointmentCommand({ appointmentId: appointment.getId() })),
      ConsultationDomainError,
    );
    assert.equal(appointmentRepo.saved.length, 0);
    const untouchedWindow = await availabilityWindowRepo.findById(window.getId());
    assert.equal(untouchedWindow?.getStatus(), 'held', 'the slot must not be released when decline() itself rejects');
  });
});
