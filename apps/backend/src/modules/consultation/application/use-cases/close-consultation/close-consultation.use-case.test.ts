import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';
import { ConsultationState } from '../../../domain/enums/consultation-state.enum.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import { CloseConsultationCommand } from './close-consultation.command.js';
import { CloseConsultationUseCase } from './close-consultation.use-case.js';

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
}

class FakeAppointmentRepository implements AppointmentRepository {
  public readonly saved: Appointment[] = [];
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
  }
  async save(appointment: Appointment): Promise<void> {
    this.saved.push(appointment);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildConfirmedAppointment(): Appointment {
  const appointment = Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    consultationType: ConsultationType.Free,
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
  appointment.confirm();
  return appointment;
}

describe('CloseConsultationUseCase', () => {
  it('closes with a completed outcome and marks the appointment Completed', async () => {
    const appointment = buildConfirmedAppointment();
    const session = ConsultationSession.open(appointment.getId());
    session.start();
    const sessionRepo = new FakeConsultationSessionRepository(session);
    const appointmentRepo = new FakeAppointmentRepository(appointment);
    const useCase = new CloseConsultationUseCase(sessionRepo, appointmentRepo, new NoopDispatcher());

    const result = await useCase.execute(
      new CloseConsultationCommand({
        consultationSessionId: session.getId(),
        completionReason: ConsultationCompletionReason.Completed,
      }),
    );

    assert.equal(result.getState(), ConsultationState.Closed);
    assert.equal(appointment.getStatus(), AppointmentStatus.Completed);
    assert.equal(appointmentRepo.saved.length, 1);
  });

  it('closes with an interrupted outcome and leaves the appointment Confirmed', async () => {
    const appointment = buildConfirmedAppointment();
    const session = ConsultationSession.open(appointment.getId());
    session.start();
    const sessionRepo = new FakeConsultationSessionRepository(session);
    const appointmentRepo = new FakeAppointmentRepository(appointment);
    const useCase = new CloseConsultationUseCase(sessionRepo, appointmentRepo, new NoopDispatcher());

    await useCase.execute(
      new CloseConsultationCommand({
        consultationSessionId: session.getId(),
        completionReason: ConsultationCompletionReason.InterruptedTechnical,
      }),
    );

    assert.equal(appointment.getStatus(), AppointmentStatus.Confirmed);
    assert.equal(appointmentRepo.saved.length, 0);
  });

  it('throws NotFoundError when the session does not exist', async () => {
    const useCase = new CloseConsultationUseCase(
      new FakeConsultationSessionRepository(null),
      new FakeAppointmentRepository(null),
      new NoopDispatcher(),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new CloseConsultationCommand({
            consultationSessionId: 'missing-id',
            completionReason: ConsultationCompletionReason.Completed,
          }),
        ),
      NotFoundError,
    );
  });
});
