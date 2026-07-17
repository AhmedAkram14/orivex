import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import { ConfirmAppointmentUseCase } from '../../../consultation/application/use-cases/confirm-appointment/confirm-appointment.use-case.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationType } from '../../../consultation/domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { ConfirmAvailabilityWindowUseCase } from '../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { AvailabilityWindow } from '../../../doctor/domain/entities/availability-window.entity.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import { ConsultationType as DoctorConsultationType } from '../../../doctor/domain/enums/consultation-type.enum.js';
import type { AvailabilityWindowRepository } from '../../../doctor/domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { ConfirmSlotUseCase } from '../../../scheduling/application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { InitiateChargeUseCase } from '../../application/use-cases/initiate-charge/initiate-charge.use-case.js';
import type { PaymentGatewayPort } from '../../application/ports/payment-gateway.port.js';
import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../domain/repositories/payment-transaction.repository.js';

import { PaymentController } from './payment.controller.js';

class InMemoryAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment) {}
  async findById(id: string): Promise<Appointment | null> {
    return this.appointment.getId() === id ? this.appointment : null;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
  }
  async save(): Promise<void> {}
}

class InMemoryConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.session.getId() === id ? this.session : null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryAvailabilityWindowRepository implements AvailabilityWindowRepository {
  constructor(private readonly window: AvailabilityWindow) {}
  async findById(): Promise<AvailabilityWindow | null> {
    return this.window;
  }
  async findOverlapping(): Promise<AvailabilityWindow[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile) {}
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryPaymentTransactionRepository implements PaymentTransactionRepository {
  async findById(): Promise<PaymentTransaction | null> {
    return null;
  }
  async save(): Promise<void> {}
}

// Test-only fake gateway -- standard test-double practice, not a
// production adapter. PaymentModule itself registers no provider for
// PAYMENT_GATEWAY (architect direction).
class FakeGateway implements PaymentGatewayPort {
  constructor(private readonly succeeds: boolean) {}
  async authorize(): Promise<{ succeeded: boolean }> {
    return { succeeded: this.succeeds };
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }

  subscribe(): void {}
}

async function buildApp(gatewaySucceeds: boolean): Promise<{ app: INestApplication; sessionId: string }> {
  const window = AvailabilityWindow.define({
    doctorId: '33333333-3333-4333-8333-333333333333',
    startTime: new Date(Date.now() + 60 * 60_000),
    endTime: new Date(Date.now() + 90 * 60_000),
    consultationType: DoctorConsultationType.Paid,
  });
  window.hold();
  const appointment = Appointment.request({
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    availabilityWindowId: window.getId(),
    consultationType: ConsultationType.Paid,
    scheduledAt: window.getStartTime(),
  });
  const session = ConsultationSession.open(appointment.getId());
  const doctor = DoctorProfile.reconstitute({
    id: appointment.getDoctorId(),
    accountId: '44444444-4444-4444-8444-444444444444',
    licenseNumber: 'LIC-1',
    specialty: 'Cardiology',
    consultationFeeAmount: 500,
    languages: [],
    publications: [],
    awards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const availabilityWindowRepo = new InMemoryAvailabilityWindowRepository(window);
  const appointmentRepo = new InMemoryAppointmentRepository(appointment);
  const sessionRepo = new InMemoryConsultationSessionRepository(session);
  const doctorProfileRepo = new InMemoryDoctorProfileRepository(doctor);
  const paymentTransactionRepo = new InMemoryPaymentTransactionRepository();

  const confirmAppointmentUseCase = new ConfirmAppointmentUseCase(
    appointmentRepo,
    sessionRepo,
    new ConfirmSlotUseCase(new ConfirmAvailabilityWindowUseCase(availabilityWindowRepo, new NoopDomainEventDispatcher())),
    new NoopDomainEventDispatcher(),
  );
  const initiateChargeUseCase = new InitiateChargeUseCase(
    paymentTransactionRepo,
    new NoopDomainEventDispatcher(),
    new GetConsultationSessionByIdUseCase(sessionRepo),
    new GetAppointmentByIdUseCase(appointmentRepo),
    new GetDoctorProfileByIdUseCase(doctorProfileRepo),
    confirmAppointmentUseCase,
    new FakeGateway(gatewaySucceeds),
  );

  const moduleRef = await Test.createTestingModule({
    controllers: [PaymentController],
    providers: [
      PinoLoggerService,
      { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
      { provide: InitiateChargeUseCase, useValue: initiateChargeUseCase },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: createValidationException,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
  await app.init();

  return { app, sessionId: session.getId() };
}

describe('PaymentController (integration)', () => {
  it('POST /payments succeeds and returns a Succeeded transaction', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({ consultationSessionId: sessionId, amount: { amount: 500, currency: 'EGP' }, paymentMethod: 'card' })
        .expect(201);

      assert.equal(response.body.data.status, 'succeeded');
      assert.equal(response.body.data.amount.currency, 'EGP');
    } finally {
      await app.close();
    }
  });

  it('POST /payments returns 402 when the gateway declines', async () => {
    const { app, sessionId } = await buildApp(false);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({ consultationSessionId: sessionId, amount: { amount: 500, currency: 'EGP' }, paymentMethod: 'card' })
        .expect(402);

      assert.equal(response.body.error.code, 'PAYMENT_REQUIRED');
    } finally {
      await app.close();
    }
  });

  it('POST /payments returns 404 for an unknown consultationSessionId', async () => {
    const { app } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({
          consultationSessionId: '99999999-9999-4999-8999-999999999999',
          amount: { amount: 500, currency: 'EGP' },
          paymentMethod: 'card',
        })
        .expect(404);

      assert.equal(response.body.error.code, 'NOT_FOUND');
    } finally {
      await app.close();
    }
  });

  it('POST /payments rejects an invalid amount with 400', async () => {
    const { app, sessionId } = await buildApp(true);
    try {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({ consultationSessionId: sessionId, amount: { amount: -5, currency: 'EGP' }, paymentMethod: 'card' })
        .expect(400);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    } finally {
      await app.close();
    }
  });
});
