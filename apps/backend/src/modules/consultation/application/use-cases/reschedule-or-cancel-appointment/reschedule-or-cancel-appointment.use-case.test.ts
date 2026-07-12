import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { ReleaseAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { ReserveAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import { ConfirmSlotUseCase } from '../../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ReleaseSlotUseCase } from '../../../../scheduling/application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotUseCase } from '../../../../scheduling/application/use-cases/reserve-slot/reserve-slot.use-case.js';
import { Appointment } from '../../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import { ConfirmAppointmentUseCase } from '../confirm-appointment/confirm-appointment.use-case.js';

import { RescheduleOrCancelAppointmentCommand } from './reschedule-or-cancel-appointment.command.js';
import { RescheduleOrCancelAppointmentUseCase } from './reschedule-or-cancel-appointment.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  private readonly byId = new Map<string, Appointment>();
  public readonly saved: Appointment[] = [];
  public failOnSaveCount = 0;
  seed(appointment: Appointment): void {
    this.byId.set(appointment.getId(), appointment);
  }
  async findById(id: string): Promise<Appointment | null> {
    return this.byId.get(id) ?? null;
  }
  async save(appointment: Appointment): Promise<void> {
    if (this.failOnSaveCount > 0) {
      this.failOnSaveCount -= 1;
      throw new Error('simulated persistence failure');
    }
    this.saved.push(appointment);
    this.byId.set(appointment.getId(), appointment);
  }
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  async findById(): Promise<ConsultationSession | null> {
    return null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildOpenWindow(consultationType: DoctorConsultationType = DoctorConsultationType.Free): AvailabilityWindow {
  const startTime = new Date(Date.now() + 60 * 60_000);
  return AvailabilityWindow.define({
    doctorId: '22222222-2222-4222-8222-222222222222',
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60_000),
    consultationType,
  });
}

function buildUseCase(availabilityWindowRepo: AvailabilityWindowRepository, appointmentRepo: FakeAppointmentRepository) {
  return new RescheduleOrCancelAppointmentUseCase(
    appointmentRepo,
    new NoopDispatcher(),
    new GetAvailabilityWindowByIdUseCase(availabilityWindowRepo),
    new ReserveSlotUseCase(new ReserveAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
    new ReleaseSlotUseCase(new ReleaseAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
    new ConfirmAppointmentUseCase(
      appointmentRepo,
      new FakeConsultationSessionRepository(),
      new ConfirmSlotUseCase(new ConfirmAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDispatcher())),
      new NoopDispatcher(),
    ),
  );
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
  async save(window: AvailabilityWindow): Promise<void> {
    this.byId.set(window.getId(), window);
  }
}

describe('RescheduleOrCancelAppointmentUseCase', () => {
  it('cancels a Requested appointment and releases its held slot', async () => {
    const window = buildOpenWindow();
    window.hold();
    const windowRepo = new InMemoryAvailabilityWindowRepository();
    windowRepo.seed(window);

    const appointment = Appointment.request({
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      availabilityWindowId: window.getId(),
      consultationType: ConsultationType.Free,
      scheduledAt: window.getStartTime(),
    });
    const appointmentRepo = new FakeAppointmentRepository();
    appointmentRepo.seed(appointment);
    const useCase = buildUseCase(windowRepo, appointmentRepo);

    const result = await useCase.execute(
      new RescheduleOrCancelAppointmentCommand({ appointmentId: appointment.getId(), action: 'cancel' }),
    );

    assert.equal(result.getStatus(), AppointmentStatus.Cancelled);
    const releasedWindow = await windowRepo.findById(window.getId());
    assert.equal(releasedWindow?.getStatus(), 'open');
  });

  it('reschedules to a new window, marking the old appointment Rescheduled', async () => {
    const oldWindow = buildOpenWindow();
    oldWindow.hold();
    const newWindow = buildOpenWindow();
    const windowRepo = new InMemoryAvailabilityWindowRepository();
    windowRepo.seed(oldWindow);
    windowRepo.seed(newWindow);

    const appointment = Appointment.request({
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      availabilityWindowId: oldWindow.getId(),
      consultationType: ConsultationType.Free,
      scheduledAt: oldWindow.getStartTime(),
    });
    const appointmentRepo = new FakeAppointmentRepository();
    appointmentRepo.seed(appointment);
    const useCase = buildUseCase(windowRepo, appointmentRepo);

    const newAppointment = await useCase.execute(
      new RescheduleOrCancelAppointmentCommand({
        appointmentId: appointment.getId(),
        action: 'reschedule',
        newAvailabilityWindowId: newWindow.getId(),
      }),
    );

    assert.notEqual(newAppointment.getId(), appointment.getId());
    assert.equal(newAppointment.getRescheduledFromId(), appointment.getId());
    assert.equal(newAppointment.getStatus(), AppointmentStatus.Confirmed);

    const oldAppointment = await appointmentRepo.findById(appointment.getId());
    assert.equal(oldAppointment?.getStatus(), AppointmentStatus.Rescheduled);
  });

  it('throws ConsultationDomainError when rescheduling without a newAvailabilityWindowId', async () => {
    const window = buildOpenWindow();
    window.hold();
    const windowRepo = new InMemoryAvailabilityWindowRepository();
    windowRepo.seed(window);
    const appointment = Appointment.request({
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      availabilityWindowId: window.getId(),
      consultationType: ConsultationType.Free,
      scheduledAt: window.getStartTime(),
    });
    const appointmentRepo = new FakeAppointmentRepository();
    appointmentRepo.seed(appointment);
    const useCase = buildUseCase(windowRepo, appointmentRepo);

    await assert.rejects(
      () =>
        useCase.execute(
          new RescheduleOrCancelAppointmentCommand({ appointmentId: appointment.getId(), action: 'reschedule' }),
        ),
      ConsultationDomainError,
    );
  });

  it('releases the newly-reserved window if persisting the reschedule fails', async () => {
    const oldWindow = buildOpenWindow();
    oldWindow.hold();
    const newWindow = buildOpenWindow();
    const windowRepo = new InMemoryAvailabilityWindowRepository();
    windowRepo.seed(oldWindow);
    windowRepo.seed(newWindow);

    const appointment = Appointment.request({
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      availabilityWindowId: oldWindow.getId(),
      consultationType: ConsultationType.Free,
      scheduledAt: oldWindow.getStartTime(),
    });
    const appointmentRepo = new FakeAppointmentRepository();
    appointmentRepo.seed(appointment);
    appointmentRepo.failOnSaveCount = 1;
    const useCase = buildUseCase(windowRepo, appointmentRepo);

    await assert.rejects(() =>
      useCase.execute(
        new RescheduleOrCancelAppointmentCommand({
          appointmentId: appointment.getId(),
          action: 'reschedule',
          newAvailabilityWindowId: newWindow.getId(),
        }),
      ),
    );

    const releasedNewWindow = await windowRepo.findById(newWindow.getId());
    assert.equal(releasedNewWindow?.getStatus(), 'open');
  });

  it('throws NotFoundError when the appointment does not exist', async () => {
    const windowRepo = new InMemoryAvailabilityWindowRepository();
    const useCase = buildUseCase(windowRepo, new FakeAppointmentRepository());

    await assert.rejects(
      () =>
        useCase.execute(
          new RescheduleOrCancelAppointmentCommand({
            appointmentId: '99999999-9999-4999-8999-999999999999',
            action: 'cancel',
          }),
        ),
      NotFoundError,
    );
  });
});
