import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';
import { ConsultationState } from '../../../domain/enums/consultation-state.enum.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';

import { StartConsultationCommand } from './start-consultation.command.js';
import { StartConsultationUseCase } from './start-consultation.use-case.js';

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  public readonly saved: ConsultationSession[] = [];
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(session: ConsultationSession): Promise<void> {
    this.saved.push(session);
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
}

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(id: string): Promise<Appointment | null> {
    return this.appointment && this.appointment.getId() === id ? this.appointment : null;
  }
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async findRequestedPastScheduledAt(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
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
  async countByStatusForDoctorInRange(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async countFreeRequestedForDoctorInRange(): Promise<number> {
    return 0;
  }
  async countByDoctorIdBucketed(): Promise<{ bucket: string; count: number }[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function confirmedAppointment(): Appointment {
  const appointment = Appointment.request({
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    availabilityWindowId: '44444444-4444-4444-8444-444444444444',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(),
  });
  appointment.confirm();
  return appointment;
}

// The session ConfirmAppointmentUseCase opened at confirmation, still in WaitingRoom.
function setUp(appointment: Appointment, session = ConsultationSession.open(appointment.getId())) {
  const sessions = new FakeConsultationSessionRepository(session);
  const useCase = new StartConsultationUseCase(sessions, new FakeAppointmentRepository(appointment), new NoopDispatcher());
  return { session, sessions, useCase, command: new StartConsultationCommand({ consultationSessionId: session.getId() }) };
}

describe('StartConsultationUseCase', () => {
  it('transitions a confirmed appointment\'s WaitingRoom session to InProgress', async () => {
    const { useCase, sessions, command } = setUp(confirmedAppointment());

    const result = await useCase.execute(command);

    assert.equal(result.getState(), ConsultationState.InProgress);
    assert.equal(sessions.saved.length, 1);
  });

  // A cancel, reschedule or no-show leaves the session in WaitingRoom until
  // the stale-session sweep closes it hours later; the start action itself
  // must refuse it.
  for (const [label, settle] of [
    ['cancelled', (appointment: Appointment) => appointment.cancel('doctor')],
    ['rescheduled (superseded)', (appointment: Appointment) => appointment.markRescheduled()],
    ['a no-show', (appointment: Appointment) => appointment.markNoShow()],
    ['already completed', (appointment: Appointment) => appointment.complete()],
  ] as const) {
    it(`rejects starting when the appointment is ${label}, leaving the session untouched`, async () => {
      const appointment = confirmedAppointment();
      const { useCase, session, sessions, command } = setUp(appointment);
      settle(appointment);

      await assert.rejects(() => useCase.execute(command), ConsultationDomainError);
      assert.equal(session.getState(), ConsultationState.WaitingRoom);
      assert.equal(sessions.saved.length, 0);
    });
  }

  it('rejects starting a consultation whose appointment expired before it was ever confirmed', async () => {
    const appointment = Appointment.request({
      patientId: '22222222-2222-4222-8222-222222222222',
      doctorId: '33333333-3333-4333-8333-333333333333',
      availabilityWindowId: '44444444-4444-4444-8444-444444444444',
      pricing: ConsultationPricing.free(),
      scheduledAt: new Date(),
    });
    appointment.expire();
    const { useCase, sessions, command } = setUp(appointment);

    await assert.rejects(() => useCase.execute(command), ConsultationDomainError);
    assert.equal(sessions.saved.length, 0);
  });

  it('still rejects starting a consultation that is already in progress', async () => {
    const appointment = confirmedAppointment();
    const session = ConsultationSession.open(appointment.getId());
    session.start();
    const { useCase, sessions, command } = setUp(appointment, session);

    await assert.rejects(() => useCase.execute(command), ConsultationDomainError);
    assert.equal(session.getState(), ConsultationState.InProgress);
    assert.equal(sessions.saved.length, 0);
  });

  it('still rejects starting a consultation that is already closed', async () => {
    const appointment = confirmedAppointment();
    const session = ConsultationSession.open(appointment.getId());
    session.close(ConsultationCompletionReason.InterruptedTechnical);
    const { useCase, command } = setUp(appointment, session);

    await assert.rejects(() => useCase.execute(command), ConsultationDomainError);
  });

  it('throws NotFoundError when the session does not exist', async () => {
    const useCase = new StartConsultationUseCase(new FakeConsultationSessionRepository(null), new FakeAppointmentRepository(null), new NoopDispatcher());

    await assert.rejects(() => useCase.execute(new StartConsultationCommand({ consultationSessionId: 'missing-id' })), NotFoundError);
  });

  it('throws NotFoundError when the session\'s appointment does not exist', async () => {
    const appointment = confirmedAppointment();
    const session = ConsultationSession.open(appointment.getId());
    const useCase = new StartConsultationUseCase(new FakeConsultationSessionRepository(session), new FakeAppointmentRepository(null), new NoopDispatcher());

    await assert.rejects(() => useCase.execute(new StartConsultationCommand({ consultationSessionId: session.getId() })), NotFoundError);
  });
});
