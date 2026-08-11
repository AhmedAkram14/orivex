import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConfirmAppointmentUseCase } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import type { ConfirmAppointmentCommand } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.command.js';
import type { ConfirmAppointmentResult } from '../../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
import type { AppointmentRepository } from '../../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../../consultation/domain/repositories/consultation-session.repository.js';
import { ConsultationPricing } from '../../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import { Money as ConsultationMoney } from '../../../../consultation/domain/value-objects/money.value-object.js';
import { ConfirmSlotUseCase } from '../../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';
import { ConsultationPricing as DoctorConsultationPricing } from '../../../../doctor/domain/value-objects/consultation-pricing.value-object.js';
import { Money as DoctorMoney } from '../../../../doctor/domain/value-objects/money.value-object.js';
import type { AvailabilityWindowRepository } from '../../../../doctor/domain/repositories/availability-window.repository.js';
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
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
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
  async findStale(): Promise<ConsultationSession[]> {
    return [];
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
  async findByDoctorAndRange(): Promise<AvailabilityWindow[]> {
    return [];
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
  async findByAppointmentId(appointmentId: string): Promise<PaymentTransaction | null> {
    return this.saved.find((t) => t.getAppointmentId() === appointmentId) ?? null;
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

// Used only by the auto-refund test: authorizes successfully with a
// gateway externalReference (required by PaymentTransaction.refund()) and
// records whether/what refund() was called with, so the test can assert
// the gateway-side refund actually happened.
class FakeGatewayWithRefundTracking implements PaymentGatewayPort {
  public refundCalled = false;
  public refundedReference: string | undefined;

  async authorize(): Promise<{ succeeded: boolean; externalReference?: string }> {
    return { succeeded: true, externalReference: 'pi_confirm_fails_after_charge' };
  }
  async refund(request: { externalReference: string }): Promise<{ succeeded: boolean }> {
    this.refundCalled = true;
    this.refundedReference = request.externalReference;
    return { succeeded: true };
  }
}

// Simulates ConfirmAppointmentUseCase losing a race (e.g. the slot's hold
// lapsed) right after a charge succeeds -- InitiateChargeUseCase's
// constructor takes the concrete ConfirmAppointmentUseCase class (private
// fields, so structurally distinct from a plain object), hence the cast at
// the call site.
class ThrowingConfirmAppointmentUseCase {
  async execute(_command: ConfirmAppointmentCommand): Promise<ConfirmAppointmentResult> {
    throw new Error('Slot no longer available.');
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildAppointment(): Appointment {
  const window = AvailabilityWindow.define({
    doctorId: '33333333-3333-4333-8333-333333333333',
    startTime: new Date(Date.now() + 60 * 60_000),
    endTime: new Date(Date.now() + 90 * 60_000),
    pricing: DoctorConsultationPricing.paid(DoctorMoney.create(500, 'EGP')),
  });
  return Appointment.request({
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    availabilityWindowId: window.getId(),
    pricing: ConsultationPricing.paid(ConsultationMoney.create(500, 'EGP')),
    scheduledAt: window.getStartTime(),
  });
}

function buildUseCase(props: {
  appointment: Appointment | null;
  gateway: PaymentGatewayPort;
  transactionRepo: FakePaymentTransactionRepository;
}): InitiateChargeUseCase {
  const availabilityWindow = AvailabilityWindow.define({
    doctorId: '33333333-3333-4333-8333-333333333333',
    startTime: new Date(Date.now() + 60 * 60_000),
    endTime: new Date(Date.now() + 90 * 60_000),
    pricing: DoctorConsultationPricing.free(),
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
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(props.appointment)),
    confirmAppointmentUseCase,
    props.gateway,
  );
}

describe('InitiateChargeUseCase', () => {
  it('succeeds: persists a Succeeded transaction', async () => {
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    const transaction = await useCase.execute(
      new InitiateChargeCommand({
        idempotencyKey: 'idem-key-succeeds',
        appointmentId: appointment.getId(),
        amount: 500,
        currency: 'EGP',
        paymentMethod: PaymentMethod.Card,
        paymentMethodToken: 'pm_test_card',
      }),
    );

    assert.equal(transaction.getStatus(), PaymentStatus.Succeeded);
    assert.equal(transaction.getPatientId(), appointment.getPatientId());
    // Initiated, Succeeded, then a final save once ConfirmAppointmentUseCase
    // opens the session and attachConsultationSessionId() is persisted.
    assert.equal(transactionRepo.saved.length, 3);
    assert.ok(transaction.getConsultationSessionId());
  });

  it('fails: persists a Failed transaction and throws PaymentAuthorizationFailedError', async () => {
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment,
      gateway: new FakeFailingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-fails',
            appointmentId: appointment.getId(),
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

  it('throws NotFoundError when the appointment does not exist', async () => {
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment: null,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-unknown-appointment',
            appointmentId: '99999999-9999-4999-8999-999999999999',
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

  // Consultation Pricing Lifecycle Completion: a charge can only be
  // initiated against an appointment still awaiting payment. An already
  // Confirmed appointment (e.g. a second tab replaying a stale "Pay" click
  // after the first one already succeeded, with a *different* idempotency
  // key so replay() doesn't short-circuit it) must be rejected before any
  // transaction is ever persisted.
  it('throws PaymentDomainError when the appointment is not Requested (already confirmed)', async () => {
    const appointment = buildAppointment();
    appointment.confirm();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-not-requested',
            appointmentId: appointment.getId(),
            amount: 500,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
          }),
        ),
      (error: unknown) => error instanceof PaymentDomainError && /not awaiting payment/.test((error as Error).message),
    );
    assert.equal(transactionRepo.saved.length, 0);
  });

  it('throws PaymentDomainError when the requested amount does not match the appointment\'s own consultation fee', async () => {
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-amount-mismatch',
            appointmentId: appointment.getId(),
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

  // Consultation Pricing Redesign: InitiateChargeUseCase no longer consults
  // DoctorModule at all -- amount/currency are validated against the
  // Appointment's own snapshotted pricing. A "Paid consultation with no
  // fee" state is unrepresentable through ConsultationPricing's public API
  // (paid() always requires a fee), so the only way to exercise the "no fee
  // to charge against" branch through valid domain construction is a Free
  // appointment -- the same branch as the free-consultation test below.
  it('throws PaymentDomainError when the appointment has no fee to charge (free pricing)', async () => {
    const window = AvailabilityWindow.define({
      doctorId: '33333333-3333-4333-8333-333333333333',
      startTime: new Date(Date.now() + 60 * 60_000),
      endTime: new Date(Date.now() + 90 * 60_000),
      pricing: DoctorConsultationPricing.free(),
    });
    const freeAppointment = Appointment.request({
      patientId: '22222222-2222-4222-8222-222222222222',
      doctorId: '33333333-3333-4333-8333-333333333333',
      availabilityWindowId: window.getId(),
      pricing: ConsultationPricing.free(),
      scheduledAt: window.getStartTime(),
    });
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment: freeAppointment,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-no-fee',
            appointmentId: freeAppointment.getId(),
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
      pricing: DoctorConsultationPricing.free(),
    });
    const freeAppointment = Appointment.request({
      patientId: '22222222-2222-4222-8222-222222222222',
      doctorId: '33333333-3333-4333-8333-333333333333',
      availabilityWindowId: window.getId(),
      pricing: ConsultationPricing.free(),
      scheduledAt: window.getStartTime(),
    });
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({
      appointment: freeAppointment,
      gateway: new FakeSucceedingGateway(),
      transactionRepo,
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-free-consultation',
            appointmentId: freeAppointment.getId(),
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
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    let authorizeCallCount = 0;
    const countingGateway: PaymentGatewayPort = {
      authorize: async () => {
        authorizeCallCount += 1;
        return { succeeded: true };
      },
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, gateway: countingGateway, transactionRepo });

    const command = new InitiateChargeCommand({
      idempotencyKey: 'idem-key-replay',
      appointmentId: appointment.getId(),
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
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    let authorizeCallCount = 0;
    const countingFailingGateway: PaymentGatewayPort = {
      authorize: async () => {
        authorizeCallCount += 1;
        return { succeeded: false };
      },
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, gateway: countingFailingGateway, transactionRepo });

    const command = new InitiateChargeCommand({
      idempotencyKey: 'idem-key-replay-failure',
      appointmentId: appointment.getId(),
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
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    const useCase = buildUseCase({ appointment, gateway: new FakeSucceedingGateway(), transactionRepo });

    await useCase.execute(
      new InitiateChargeCommand({
        idempotencyKey: 'idem-key-conflict',
        appointmentId: appointment.getId(),
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
            appointmentId: appointment.getId(),
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
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    const gateway: PaymentGatewayPort = {
      authorize: async () => ({ succeeded: true, externalReference: 'pi_from_gateway_123' }),
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, gateway, transactionRepo });

    const transaction = await useCase.execute(
      new InitiateChargeCommand({
        idempotencyKey: 'idem-key-external-reference',
        appointmentId: appointment.getId(),
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
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    const gateway: PaymentGatewayPort = {
      authorize: async () => ({ succeeded: false, externalReference: 'pi_declined_but_referenced' }),
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, gateway, transactionRepo });

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-external-reference-on-failure',
            appointmentId: appointment.getId(),
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
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    const gateway: PaymentGatewayPort = {
      authorize: async () => ({ succeeded: true }),
      refund: async () => ({ succeeded: true }),
    };
    const useCase = buildUseCase({ appointment, gateway, transactionRepo });

    const transaction = await useCase.execute(
      new InitiateChargeCommand({
        idempotencyKey: 'idem-key-no-external-reference',
        appointmentId: appointment.getId(),
        amount: 500,
        currency: 'EGP',
        paymentMethod: PaymentMethod.Card,
        paymentMethodToken: 'pm_test_card',
      }),
    );

    assert.equal(transaction.getExternalReference(), undefined);
  });

  // Consultation Pricing Lifecycle Completion's "technical-failure
  // auto-refund" policy (docs/01-prd.md): if the charge itself succeeds but
  // the appointment can no longer be confirmed afterward (e.g. the slot's
  // hold lapsed while the patient was paying, or a concurrent charge won a
  // race), the transaction must not be left Succeeded against an
  // appointment nobody can ever use -- it's auto-refunded and a clear error
  // is surfaced instead.
  it('auto-refunds the charge and throws PaymentDomainError when confirmation fails after a successful charge', async () => {
    const appointment = buildAppointment();
    const transactionRepo = new FakePaymentTransactionRepository();
    const gateway = new FakeGatewayWithRefundTracking();

    const useCase = new InitiateChargeUseCase(
      transactionRepo,
      new NoopDispatcher(),
      new GetAppointmentByIdUseCase(new FakeAppointmentRepository(appointment)),
      new ThrowingConfirmAppointmentUseCase() as unknown as ConfirmAppointmentUseCase,
      gateway,
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new InitiateChargeCommand({
            idempotencyKey: 'idem-key-confirm-fails',
            appointmentId: appointment.getId(),
            amount: 500,
            currency: 'EGP',
            paymentMethod: PaymentMethod.Card,
            paymentMethodToken: 'pm_test_card',
          }),
        ),
      (error: unknown) => error instanceof PaymentDomainError && /automatically refunded/.test((error as Error).message),
    );

    const finalTransaction = transactionRepo.saved.at(-1);
    assert.equal(finalTransaction?.getStatus(), PaymentStatus.Refunded);
    assert.equal(gateway.refundCalled, true);
    assert.equal(gateway.refundedReference, 'pi_confirm_fails_after_charge');
  });
});
