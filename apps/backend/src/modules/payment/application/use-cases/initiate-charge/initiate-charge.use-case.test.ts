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
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../../doctor/domain/enums/consultation-type.enum.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum.js';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum.js';
import { IdempotencyKeyConflictError } from '../../../domain/exceptions/idempotency-key-conflict.error.js';
import { PaymentAuthorizationFailedError } from '../../../domain/exceptions/payment-authorization-failed.error.js';
import { PaymentDomainError } from '../../../domain/exceptions/payment-domain.error.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port.js';

import { InitiateChargeCommand } from './initiate-charge.command.js';
import { InitiateChargeUseCase } from './initiate-charge.use-case.js';

class FakeAppointmentRepository implements AppointmentRepository {
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

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakePaymentTransactionRepository implements PaymentTransactionRepository {
  public readonly saved: PaymentTransaction[] = [];
  private readonly byIdempotencyKey = new Map<string, PaymentTransaction>();

  async findById(): Promise<PaymentTransaction | null> {
    return null;
  }
  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransaction | null> {
    return this.byIdempotencyKey.get(idempotencyKey) ?? null;
  }
  async findByExternalReference(externalReference: string): Promise<PaymentTransaction | null> {
    return this.saved.find((t) => t.getExternalReference() === externalReference) ?? null;
  }
  async findByConsultationSessionId(consultationSessionId: string): Promise<PaymentTransaction | null> {
    return this.saved.find((t) => t.getConsultationSessionId() === consultationSessionId) ?? null;
  }
  async save(transaction: PaymentTransaction): Promise<void> {
    this.saved.push(transaction);
    this.byIdempotencyKey.set(transaction.getIdempotencyKey(), transaction);
  }
}

class FakeSucceedingGateway implements PaymentGatewayPort {
  async authorize(): Promise<{ succeeded: boolean }> {
    return { succeeded: true };
  }
  async refund(): Promise<{ succeeded: boolean }> {
    return { succeeded: true };
  }
}

class FakeFailingGateway implements PaymentGatewayPort {
  async authorize(): Promise<{ succeeded: boolean }> {
    return { succeeded: false };
  }
  async refund(): Promise<{ succeeded: boolean }> {
    return { succeeded: true };
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
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

// consultationFeeAmount is required (not defaulted) -- a JS default
// parameter is NOT applied only when the argument is omitted entirely; an
// explicitly-passed `undefined` also triggers it, which would silently
// defeat a test that means to construct a doctor with no configured fee.
function buildDoctorProfile(consultationFeeAmount: number | undefined): DoctorProfile {
  return DoctorProfile.register({
    accountId: '44444444-4444-4444-8444-444444444444',
    licenseNumber: 'LIC-1',
    specialty: 'Cardiology',
    consultationFeeAmount,
  });
}

function buildUseCase(props: {
  appointment: Appointment | null;
  session: ConsultationSession | null;
  doctor?: DoctorProfile | null;
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
    new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(props.doctor === undefined ? buildDoctorProfile(500) : props.doctor)),
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
        idempotencyKey: 'idem-key-succeeds',
        consultationSessionId: session.getId(),
        amount: 500,
        currency: 'EGP',
        paymentMethod: PaymentMethod.Card,
        paymentMethodToken: 'pm_test_card',
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
            idempotencyKey: 'idem-key-fails',
            consultationSessionId: session.getId(),
            amount: 500,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
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
            idempotencyKey: 'idem-key-unknown-session',
            consultationSessionId: '99999999-9999-4999-8999-999999999999',
            amount: 500,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
          }),
        ),
      NotFoundError,
    );
    assert.equal(transactionRepo.saved.length, 0);
  });

  it('throws PaymentDomainError when the requested amount does not match the doctor\'s consultation fee', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment,
      session,
      doctor: buildDoctorProfile(500),
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-amount-mismatch',
            consultationSessionId: session.getId(),
            amount: 1,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
          }),
        ),
      PaymentDomainError,
    );
    assert.equal(transactionRepo.saved.length, 0);
  });

  it('throws PaymentDomainError when the doctor has no configured consultation fee', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment,
      session,
      doctor: buildDoctorProfile(undefined),
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-no-fee',
            consultationSessionId: session.getId(),
            amount: 500,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
          }),
        ),
      PaymentDomainError,
    );
    assert.equal(transactionRepo.saved.length, 0);
  });

  it('throws PaymentDomainError when initiating a charge for a free consultation', async () => {
    const window = AvailabilityWindow.define({
      doctorId: '33333333-3333-4333-8333-333333333333',
      startTime: new Date(Date.now() + 60 * 60_000),
      endTime: new Date(Date.now() + 90 * 60_000),
      consultationType: DoctorConsultationType.Free,
    });
    const freeAppointment = Appointment.request({
      patientId: '22222222-2222-4222-8222-222222222222',
      doctorId: '33333333-3333-4333-8333-333333333333',
      availabilityWindowId: window.getId(),
      consultationType: ConsultationType.Free,
      scheduledAt: window.getStartTime(),
    });
    const freeSession = ConsultationSession.open(freeAppointment.getId());
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment: freeAppointment,
      session: freeSession,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-free-consultation',
            consultationSessionId: freeSession.getId(),
            amount: 0,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
          }),
        ),
      PaymentDomainError,
    );
    assert.equal(transactionRepo.saved.length, 0);
  });

  it('replays the original outcome instead of re-charging when the same idempotency key is reused with the same request', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    let authorizeCallCount = 0;
    const countingGateway: PaymentGatewayPort = {
      authorize: async () => {
        authorizeCallCount += 1;
        return { succeeded: true };
      },
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, session, gateway: countingGateway, transactionRepo });

    const command = new InitiateChargeCommand({
      idempotencyKey: 'idem-key-replay',
      consultationSessionId: session.getId(),
      amount: 500,
      currency: 'EGP',
      paymentMethod: PaymentMethod.Card,
      paymentMethodToken: 'pm_test_card',
    });

    const first = await useCase.execute(command);
    const second = await useCase.execute(command);

    assert.equal(authorizeCallCount, 1);
    assert.equal(second.getId(), first.getId());
    assert.equal(second.getStatus(), PaymentStatus.Succeeded);
  });

  it('replays a prior failure without recalling the gateway when the same idempotency key is reused', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    let authorizeCallCount = 0;
    const countingFailingGateway: PaymentGatewayPort = {
      authorize: async () => {
        authorizeCallCount += 1;
        return { succeeded: false };
      },
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, session, gateway: countingFailingGateway, transactionRepo });

    const command = new InitiateChargeCommand({
      idempotencyKey: 'idem-key-replay-failure',
      consultationSessionId: session.getId(),
      amount: 500,
      currency: 'EGP',
      paymentMethod: PaymentMethod.Card,
      paymentMethodToken: 'pm_test_card',
    });

    await assert.rejects(() => useCase.execute(command), PaymentAuthorizationFailedError);
    await assert.rejects(() => useCase.execute(command), PaymentAuthorizationFailedError);

    assert.equal(authorizeCallCount, 1);
  });

  it('throws IdempotencyKeyConflictError when the same key is reused with a different request', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({ appointment, session, gateway: new FakeSucceedingGateway(), transactionRepo });

    await useCase.execute(
      new InitiateChargeCommand({
        idempotencyKey: 'idem-key-conflict',
        consultationSessionId: session.getId(),
        amount: 500,
        currency: 'EGP',
        paymentMethod: PaymentMethod.Card,
        paymentMethodToken: 'pm_test_card',
      }),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-conflict',
            consultationSessionId: session.getId(),
            amount: 999,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
          }),
        ),
      IdempotencyKeyConflictError,
    );
  });

  it('attaches the gateway externalReference to the persisted transaction on success', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    const gateway: PaymentGatewayPort = {
      authorize: async () => ({ succeeded: true, externalReference: 'pi_from_gateway_123' }),
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, session, gateway, transactionRepo });

    const transaction = await useCase.execute(
      new InitiateChargeCommand({
        idempotencyKey: 'idem-key-external-reference',
        consultationSessionId: session.getId(),
        amount: 500,
        currency: 'EGP',
        paymentMethod: PaymentMethod.Card,
        paymentMethodToken: 'pm_test_card',
      }),
    );

    assert.equal(transaction.getExternalReference(), 'pi_from_gateway_123');
    // Persisted, not just held in memory -- the final save() call must
    // have carried the reference the webhook receiver later reconciles by.
    assert.equal(transactionRepo.saved.at(-1)?.getExternalReference(), 'pi_from_gateway_123');
  });

  it('still attaches the externalReference even when the gateway reports the charge as not-yet-succeeded (async/declined but reconcilable via webhook)', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    const gateway: PaymentGatewayPort = {
      authorize: async () => ({ succeeded: false, externalReference: 'pi_declined_but_referenced' }),
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, session, gateway, transactionRepo });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-external-reference-on-failure',
            consultationSessionId: session.getId(),
            amount: 500,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
          }),
        ),
      PaymentAuthorizationFailedError,
    );

    const failedTransaction = transactionRepo.saved.at(-1);
    assert.equal(failedTransaction?.getStatus(), PaymentStatus.Failed);
    assert.equal(failedTransaction?.getExternalReference(), 'pi_declined_but_referenced');
  });

  it('never calls attachExternalReference when the gateway result carries no externalReference', async () => {
    const { appointment, session } = buildAppointmentAndSession();
    const transactionRepo = new FakePaymentTransactionRepository();
    const gateway: PaymentGatewayPort = {
      authorize: async () => ({ succeeded: true }),
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, session, gateway, transactionRepo });

    const transaction = await useCase.execute(
      new InitiateChargeCommand({
        idempotencyKey: 'idem-key-no-external-reference',
        consultationSessionId: session.getId(),
        amount: 500,
        currency: 'EGP',
        paymentMethod: PaymentMethod.Card,
        paymentMethodToken: 'pm_test_card',
      }),
    );

    assert.equal(transaction.getExternalReference(), undefined);
  });
});
