import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { ConfigService } from '@nestjs/config';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AccessToken } from 'livekit-server-sdk';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../domain/entities/consultation-session.entity.js';
import { ConsultationCompletionReason } from '../../domain/enums/consultation-completion-reason.enum.js';
import { ConsultationState } from '../../domain/enums/consultation-state.enum.js';
import type { AppointmentRepository } from '../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../domain/repositories/consultation-session.repository.js';
import { CloseConsultationUseCase } from '../../application/use-cases/close-consultation/close-consultation.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { RecordSessionConnectionLogUseCase } from '../../application/use-cases/record-session-connection-log/record-session-connection-log.use-case.js';

import { TelemedicineWebhookController } from './telemedicine-webhook.controller.js';

const LIVEKIT_API_KEY = 'test-livekit-key';
const LIVEKIT_API_SECRET = 'test-livekit-secret-long-enough';

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  public readonly saved: ConsultationSession[] = [];
  private readonly byId = new Map<string, ConsultationSession>();
  seed(session: ConsultationSession): void {
    this.byId.set(session.getId(), session);
  }
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(session: ConsultationSession): Promise<void> {
    this.saved.push(session);
    this.byId.set(session.getId(), session);
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

class FakeAppointmentRepository implements AppointmentRepository {
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
  async findByDoctorIdForDateRange(): Promise<Appointment[]> {
    return [];
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async save(): Promise<void> {}
}

function signedWebhookRequest(
  payload: object,
  { apiKey = LIVEKIT_API_KEY, apiSecret = LIVEKIT_API_SECRET }: { apiKey?: string; apiSecret?: string } = {},
): { body: string; authHeader: Promise<string> } {
  const body = JSON.stringify(payload);
  const sha256 = createHash('sha256').update(body).digest('base64');
  const accessToken = new AccessToken(apiKey, apiSecret);
  accessToken.sha256 = sha256;
  return { body, authHeader: accessToken.toJwt() };
}

function participantEvent(event: 'participant_joined' | 'participant_left', roomName: string, identity: string) {
  return { event, room: { name: roomName }, participant: { identity } };
}

async function buildApp(options: {
  configured?: boolean;
  repository?: FakeConsultationSessionRepository;
} = {}): Promise<{ app: INestApplication; repository: FakeConsultationSessionRepository }> {
  const configured = options.configured ?? true;
  const repository = options.repository ?? new FakeConsultationSessionRepository();

  const configService = {
    get: (key: string) => {
      if (key === 'LIVEKIT_API_KEY') return configured ? LIVEKIT_API_KEY : undefined;
      if (key === 'LIVEKIT_API_SECRET') return configured ? LIVEKIT_API_SECRET : undefined;
      return undefined;
    },
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [TelemedicineWebhookController],
    providers: [
      PinoLoggerService,
      { provide: ConfigService, useValue: configService },
      { provide: RecordSessionConnectionLogUseCase, useValue: new RecordSessionConnectionLogUseCase(repository) },
      { provide: GetConsultationSessionByIdUseCase, useValue: new GetConsultationSessionByIdUseCase(repository) },
      {
        provide: CloseConsultationUseCase,
        useValue: new CloseConsultationUseCase(repository, new FakeAppointmentRepository(), new NoopDispatcher()),
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
  await app.init();

  return { app, repository };
}

describe('TelemedicineWebhookController (integration)', () => {
  it('returns 503 when LiveKit is not configured', async () => {
    const { app } = await buildApp({ configured: false });
    try {
      const { body, authHeader } = signedWebhookRequest(participantEvent('participant_joined', 'consultation-x', 'doctor-1'));
      const response = await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(503);

      assert.equal(response.body.error.code, 'HTTP_ERROR');
    } finally {
      await app.close();
    }
  });

  it('returns 422 (VALIDATION_FAILED) when the authorization header is missing', async () => {
    const { app } = await buildApp();
    try {
      const { body } = signedWebhookRequest(participantEvent('participant_joined', 'consultation-x', 'doctor-1'));
      const response = await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(422);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    } finally {
      await app.close();
    }
  });

  it('returns 422 (VALIDATION_FAILED) for a signature computed with the wrong secret', async () => {
    const { app } = await buildApp();
    try {
      const { body, authHeader } = signedWebhookRequest(participantEvent('participant_joined', 'consultation-x', 'doctor-1'), {
        apiSecret: 'wrong-secret-entirely',
      });
      const response = await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(422);

      assert.equal(response.body.error.code, 'VALIDATION_FAILED');
    } finally {
      await app.close();
    }
  });

  it('records a connection log entry for a participant_joined event on the matching session', async () => {
    const repository = new FakeConsultationSessionRepository();
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    repository.seed(session);
    const { app } = await buildApp({ repository });
    try {
      const { body, authHeader } = signedWebhookRequest(
        participantEvent('participant_joined', `consultation-${session.getId()}`, 'doctor-account-1'),
      );
      const response = await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
      assert.equal(session.getConnectionLogs().length, 1);
      assert.equal(session.getConnectionLogs()[0]?.getNote(), 'participant_joined: doctor-account-1');
    } finally {
      await app.close();
    }
  });

  it('records a connection log entry for a participant_left event', async () => {
    const repository = new FakeConsultationSessionRepository();
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    repository.seed(session);
    const { app } = await buildApp({ repository });
    try {
      const { body, authHeader } = signedWebhookRequest(
        participantEvent('participant_left', `consultation-${session.getId()}`, 'patient-account-1'),
      );
      await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.equal(session.getConnectionLogs()[0]?.getNote(), 'participant_left: patient-account-1');
    } finally {
      await app.close();
    }
  });

  it('records a connection log entry for a track_published event', async () => {
    const repository = new FakeConsultationSessionRepository();
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    repository.seed(session);
    const { app } = await buildApp({ repository });
    try {
      const payload = {
        event: 'track_published',
        room: { name: `consultation-${session.getId()}` },
        participant: { identity: 'doctor-account-1' },
        track: { type: 1 },
      };
      const { body, authHeader } = signedWebhookRequest(payload);
      await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.match(session.getConnectionLogs()[0]?.getNote() ?? '', /^track_published: doctor-account-1/);
    } finally {
      await app.close();
    }
  });

  it('ignores an unhandled event type (e.g. room_started) without error', async () => {
    const { app } = await buildApp();
    try {
      const { body, authHeader } = signedWebhookRequest({ event: 'room_started', room: { name: 'consultation-x' } });
      const response = await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
    } finally {
      await app.close();
    }
  });

  it('is a silent no-op (200, not an error) for a room name that maps to no known session', async () => {
    const repository = new FakeConsultationSessionRepository();
    const { app } = await buildApp({ repository });
    try {
      const { body, authHeader } = signedWebhookRequest(
        participantEvent('participant_joined', 'consultation-99999999-9999-4999-8999-999999999999', 'doctor-account-1'),
      );
      const response = await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
      assert.equal(repository.saved.length, 0);
    } finally {
      await app.close();
    }
  });

  it('never mutates an already-Closed session (confirmation-only tolerance)', async () => {
    const repository = new FakeConsultationSessionRepository();
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    session.close(ConsultationCompletionReason.Completed);
    repository.seed(session);
    const { app } = await buildApp({ repository });
    try {
      const { body, authHeader } = signedWebhookRequest(
        participantEvent('participant_left', `consultation-${session.getId()}`, 'doctor-account-1'),
      );
      await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.equal(session.getConnectionLogs().length, 0);
      assert.equal(repository.saved.length, 0);
    } finally {
      await app.close();
    }
  });

  it('closes an InProgress session as Completed on room_finished', async () => {
    const repository = new FakeConsultationSessionRepository();
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    repository.seed(session);
    const { app } = await buildApp({ repository });
    try {
      const { body, authHeader } = signedWebhookRequest({
        event: 'room_finished',
        room: { name: `consultation-${session.getId()}` },
      });
      const response = await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
      assert.equal(session.getState(), ConsultationState.Closed);
    } finally {
      await app.close();
    }
  });

  it('closes a WaitingRoom session as InterruptedTechnical on room_finished', async () => {
    const repository = new FakeConsultationSessionRepository();
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    repository.seed(session);
    const { app } = await buildApp({ repository });
    try {
      const { body, authHeader } = signedWebhookRequest({
        event: 'room_finished',
        room: { name: `consultation-${session.getId()}` },
      });
      await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.equal(session.getState(), ConsultationState.Closed);
    } finally {
      await app.close();
    }
  });

  it('does not error when room_finished arrives for an already-Closed session (concurrent close)', async () => {
    const repository = new FakeConsultationSessionRepository();
    const session = ConsultationSession.open('11111111-1111-4111-8111-111111111111');
    session.start();
    session.close(ConsultationCompletionReason.Completed);
    repository.seed(session);
    const { app } = await buildApp({ repository });
    try {
      const { body, authHeader } = signedWebhookRequest({
        event: 'room_finished',
        room: { name: `consultation-${session.getId()}` },
      });
      const response = await request(app.getHttpServer())
        .post('/telemedicine/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', await authHeader)
        .send(body)
        .expect(200);

      assert.deepEqual(response.body, { received: true });
    } finally {
      await app.close();
    }
  });
});
