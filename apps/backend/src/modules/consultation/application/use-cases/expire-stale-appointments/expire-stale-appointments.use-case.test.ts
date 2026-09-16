import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ReleaseAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import { ConsultationPricing as DoctorConsultationPricing } from '../../../../doctor/domain/value-objects/consultation-pricing.value-object.js';
import { ReleaseSlotUseCase } from '../../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import { AppointmentExpiredEvent } from '../../../domain/events/appointment-expired.event.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';

import { ExpireStaleAppointmentsUseCase } from './expire-stale-appointments.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  public readonly saved: Appointment[] = [];
  constructor(private readonly stale: Appointment[]) {}
  async findRequestedPastScheduledAt(): Promise<Appointment[]> {
    return this.stale;
  }
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
  }
  async findById(): Promise<Appointment | null> {
    return null;
  }
  async findByPatientId(): Promise<Appointment[]> {
    return [];
  }
  async findByPatientIdPage(): Promise<Appointment[]> {
    return [];
  }
  async countByPatientId(): Promise<number> {
    return 0;
  }
  async findByDoctorId(): Promise<Appointment[]> {
    return [];
  }
  async findByPatientAndDoctor(): Promise<Appointment | null> {
    return null;
  }
  async findByDoctorIdForDateRange(): Promise<Appointment[]> {
    return [];
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

function buildStaleRequestedAppointment(): { appointment: Appointment; window: AvailabilityWindow } {
  // AvailabilityWindow.define() itself rejects a past startTime -- the window
  // was validly created in the future at booking time; only scheduledAt
  // having since passed (with nobody ever answering the request) is what
  // makes the appointment stale, so the window's own startTime is left in
  // the future while the appointment's scheduledAt is backdated below.
  const futureStartTime = new Date(Date.now() + 60 * 60_000);
  const staleScheduledAt = new Date(Date.now() - 60 * 60_000);
  const window = AvailabilityWindow.define({
    doctorId: '22222222-2222-4222-8222-222222222222',
    startTime: futureStartTime,
    endTime: new Date(futureStartTime.getTime() + 30 * 60_000),
    pricing: DoctorConsultationPricing.free(),
  });
  window.hold();
  const appointment = Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: window.getId(),
    pricing: ConsultationPricing.free(),
    scheduledAt: staleScheduledAt,
  });
  appointment.releaseDomainEvents(); // clears AppointmentBooked -- expire() is a separate transaction (the system sweep) in real usage
  return { appointment, window };
}

describe('ExpireStaleAppointmentsUseCase', () => {
  it('expires a stale Requested appointment, releases its held slot, and dispatches AppointmentExpiredEvent', async () => {
    const { appointment, window } = buildStaleRequestedAppointment();
    const appointmentRepo = new FakeAppointmentRepository([appointment]);
    const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository();
    availabilityWindowRepo.seed(window);
    const releaseSlotUseCase = new ReleaseSlotUseCase(
      new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher()),
    );
    const dispatcher = new RecordingDispatcher();
    const useCase = new ExpireStaleAppointmentsUseCase(appointmentRepo, releaseSlotUseCase, dispatcher);

    const result = await useCase.execute();

    assert.deepEqual(result, { expired: 1, failed: 0 });
    assert.equal(appointment.getStatus(), AppointmentStatus.Expired);
    assert.equal(appointmentRepo.saved.length, 1);
    const savedWindow = await availabilityWindowRepo.findById(window.getId());
    assert.equal(savedWindow?.getStatus(), 'open');
    assert.equal(dispatcher.dispatched.length, 1);
    assert.ok(dispatcher.dispatched[0] instanceof AppointmentExpiredEvent);
    assert.equal((dispatcher.dispatched[0] as AppointmentExpiredEvent).appointmentId, appointment.getId());
  });

  it('returns zero counts (not a thrown error) when there is nothing stale', async () => {
    const appointmentRepo = new FakeAppointmentRepository([]);
    const releaseSlotUseCase = new ReleaseSlotUseCase(
      new ReleaseAvailabilityWindowUseCase(new InMemoryAvailabilityWindowRepository(), new NoopDispatcher()),
    );
    const useCase = new ExpireStaleAppointmentsUseCase(appointmentRepo, releaseSlotUseCase, new NoopDispatcher());

    const result = await useCase.execute();

    assert.deepEqual(result, { expired: 0, failed: 0 });
  });

  it('one appointment failing to expire never aborts the rest of the batch', async () => {
    const { appointment: goodAppointment, window: goodWindow } = buildStaleRequestedAppointment();
    const { appointment: alreadyConfirmed, window: otherWindow } = buildStaleRequestedAppointment();
    alreadyConfirmed.confirm(); // no longer Requested -- expire() will throw for this one
    alreadyConfirmed.releaseDomainEvents();

    const appointmentRepo = new FakeAppointmentRepository([alreadyConfirmed, goodAppointment]);
    const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository();
    availabilityWindowRepo.seed(goodWindow);
    availabilityWindowRepo.seed(otherWindow);
    const releaseSlotUseCase = new ReleaseSlotUseCase(
      new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher()),
    );
    const useCase = new ExpireStaleAppointmentsUseCase(appointmentRepo, releaseSlotUseCase, new NoopDispatcher());

    const result = await useCase.execute();

    assert.deepEqual(result, { expired: 1, failed: 1 });
    assert.equal(goodAppointment.getStatus(), AppointmentStatus.Expired);
    assert.equal(appointmentRepo.saved.length, 1);
  });
});
