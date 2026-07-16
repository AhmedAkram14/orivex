import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfirmSlotUseCase } from '../../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import { ConsultationState } from '../../../domain/enums/consultation-state.enum.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import { ConfirmAppointmentCommand } from './confirm-appointment.command.js';
import { ConfirmAppointmentUseCase } from './confirm-appointment.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  public readonly saved: Appointment[] = [];
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async save(appointment: Appointment): Promise<void> {
    this.saved.push(appointment);
  }
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  public readonly saved: ConsultationSession[] = [];
  async findById(): Promise<ConsultationSession | null> {
    return null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(session: ConsultationSession): Promise<void> {
    this.saved.push(session);
  }
}

class FakeAvailabilityWindowRepository implements AvailabilityWindowRepository {
  constructor(private readonly window: AvailabilityWindow) {}
  async findById(): Promise<AvailabilityWindow | null> {
    return this.window;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildRequestedAppointment(): { appointment: Appointment; window: AvailabilityWindow } {
  const startTime = new Date(Date.now() + 60 * 60_000);
  const window = AvailabilityWindow.define({
    doctorId: '22222222-2222-4222-8222-222222222222',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    consultationType: DoctorConsultationType.Free,
  });
  window.hold();
  const appointment = Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: window.getId(),
    consultationType: ConsultationType.Free,
    scheduledAt: startTime,
  });
  return { appointment, window };
}

describe('ConfirmAppointmentUseCase', () => {
  it('confirms the appointment, confirms the slot, and opens a ConsultationSession', async () => {
    const { appointment, window } = buildRequestedAppointment();
    const appointmentRepo = new FakeAppointmentRepository(appointment);
    const sessionRepo = new FakeConsultationSessionRepository();
    const confirmSlotUseCase = new ConfirmSlotUseCase(
      new ConfirmAvailabilityWindowUseCase(new FakeAvailabilityWindowRepository(window), new NoopDispatcher()),
    );
    const useCase = new ConfirmAppointmentUseCase(appointmentRepo, sessionRepo, confirmSlotUseCase, new NoopDispatcher());

    const result = await useCase.execute(new ConfirmAppointmentCommand({ appointmentId: appointment.getId() }));

    assert.equal(result.appointment.getStatus(), AppointmentStatus.Confirmed);
    assert.equal(result.session.getState(), ConsultationState.WaitingRoom);
    assert.equal(appointmentRepo.saved.length, 1);
    assert.equal(sessionRepo.saved.length, 1);
  });
});
