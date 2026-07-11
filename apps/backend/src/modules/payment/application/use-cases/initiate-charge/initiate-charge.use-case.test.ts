import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConfirmAppointmentUseCase } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationType } from '../../../../consultation/domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../../consultation/domain/repositories/consultation-session.repository.js';
import { ConfirmSlotUseCase } from '../../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import { PaymentAuthorizationFailedError } from '../../../domain/exceptions/payment-authorization-failed.error.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port.js';

import { InitiateChargeCommand } from './initiate-charge.command.js';
import { InitiateChargeUseCase } from './initiate-charge.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async save(): Promise<void> {}
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
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

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
  public readonly saved: PaymentTransaction[] = [];
  async findById(): Promise<PaymentTransaction | null> {
    return null;
  }
  async save(transaction: PaymentTransaction): Promise<void> {
    this.saved.push(transaction);
  }
}

class FakeSucceedingGateway implements PaymentGatewayPort {
  async authorize(): Promise<{ succeeded: boolean }> {
    return { succeeded: true };
  }
}

class FakeFailingGateway implements PaymentGatewayPort {
  async authorize(): Promise<{ succeeded: boolean }> {
    return { succeeded: false };
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}
}

function buildAppointmentAndSession(): { appointment: Appointment; session: ConsultationSession } {
  const window = AvailabilityWindow.define({
    doctorId: '33333333-3333-4333-8333-333333333333',
    startTime: new Date(Date.now() + 60 * 60_000),
    endTime: new Date(Date.now() + 90 * 60_000),
    consultationType: DoctorConsultationType.Paid,
  });
  const appointment = Appointment.request({
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    availabilityWindowId: window.getId(),
    consultationType: ConsultationType.Paid,
    scheduledAt: window.getStartTime(),
  });
  const session = ConsultationSession.open(appointment.getId());
  return { appointment, session };
}

function buildUseCase(props: {
  appointment: Appointment | null;
  session: ConsultationSession | null;
  gateway: PaymentGatewayPort;
  transactionRepo: FakePaymentTransactionRepository;
}): InitiateChargeUseCase {
  const availabilityWindow = AvailabilityWindow.define({
    doctorId: '33333333-3333-4333-8333-333333333333',
    startTime: new Date(Date.now() + 60 * 60_000),
    endTime: new Date(Date.now() + 90 * 60_000),
    consultationType: DoctorConsultationType.Free,
  });
  availabilityWindow.hold();
  const confirmAppointmentUseCase = new ConfirmAppointmentUseCase(
    new FakeAppointmentRepository(props.appointment),
    new FakeConsultationSessionRepository(null),
    new ConfirmSlotUseCase(
      new ConfirmAvailabilityWindowUseCase(new FakeAvailabilityWindowRepository(availabilityWindow), new NoopDispatcher()),
    ),
    new NoopDispatcher(),
  );

  return new InitiateChargeUseCase(
    props.transactionRepo,
    new NoopDispatcher(),
    new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(props.session)),
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(props.appointment)),
    confirmAppointmentUseCase,
    props.gateway,
  );
}

describe('InitiateChargeUseCase', () => {
  it('succeeds: persists a Succeeded transaction', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment,
      session,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    const transaction = await useCase.execute(
      new InitiateChargeCommand({
        consultationSessionId: session.getId(),
        amount: 500,
        currency: 'EGP',
        paymentMethod: PaymentMethod.Card,
      }),
    );

    assert.equal(transaction.getStatus(), PaymentStatus.Succeeded);
    assert.equal(transaction.getPatientId(), appointment.getPatientId());
    assert.equal(transactionRepo.saved.length, 2); // Initiated, then Succeeded
  });

  it('fails: persists a Failed transaction and throws PaymentAuthorizationFailedError', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment,
      session,
      gateway: new FakeFailingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            consultationSessionId: session.getId(),
            amount: 500,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
          }),
        ),
      PaymentAuthorizationFailedError,
    );

    assert.equal(transactionRepo.saved.length, 2); // Initiated, then Failed
    assert.equal(transactionRepo.saved[1].getStatus(), PaymentStatus.Failed);
  });

  it('throws NotFoundError when the consultation session does not exist', async () => {
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment: null,
      session: null,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            consultationSessionId: '99999999-9999-4999-8999-999999999999',
            amount: 500,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
          }),
        ),
      NotFoundError,
    );
    assert.equal(transactionRepo.saved.length, 0);
  });
});
