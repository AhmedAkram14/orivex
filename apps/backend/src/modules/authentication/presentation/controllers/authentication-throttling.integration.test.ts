import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { APP_THROTTLERS } from '../../../../platform/http/throttlers.js';
import { RequestLoggingInterceptor } from '../../../../platform/interceptors/request-logging.interceptor.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { JWT_SIGNER } from '../../application/ports/tokens.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password/change-password.use-case.js';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password/forgot-password.use-case.js';
import { GetCurrentSessionUseCase } from '../../application/use-cases/get-current-session/get-current-session.use-case.js';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout/logout.use-case.js';
import type { RefreshSessionCommand } from '../../application/use-cases/refresh-session/refresh-session.command.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session/refresh-session.use-case.js';
import { RegisterUseCase } from '../../application/use-cases/register/register.use-case.js';
import { ResendVerificationUseCase } from '../../application/use-cases/resend-verification/resend-verification.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password/reset-password.use-case.js';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email/verify-email.use-case.js';
import { InvalidCredentialsError } from '../../domain/exceptions/invalid-credentials.error.js';
import { TokenInvalidError } from '../../domain/exceptions/token-invalid.error.js';
import { REFRESH_COOKIE_NAME } from '../utils/refresh-cookie.util.js';

import { AuthenticationController } from './authentication.controller.js';

// Throttling of POST /auth/refresh and POST /auth/login, with the app's own
// throttler declarations (APP_THROTTLERS) and the same `trust proxy 1` as
// main.ts. Every request carries `X-Forwarded-For: <client>, <proxy>`, as
// Render sees a request the frontend's /auth/* rewrite relayed: req.ip is then
// the proxy's address, shared by every user behind it. The use cases are
// stubs -- only the HTTP/throttling layer is under test.
const PROXY = '203.0.113.7';
const viaProxy = (client: string, proxy = PROXY) => `${client}, ${proxy}`;
const cookie = (token: string) => `${REFRESH_COOKIE_NAME}=${token}`;

describe('AuthenticationController throttling (real ThrottlerGuard, behind a proxy)', () => {
  let app: INestApplication;
  const logLines: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  before(async () => {
    const refreshSessionStub = {
      // A "valid-" token refreshes (returning it unchanged keeps the test about one token); anything else is invalid.
      async execute(command: RefreshSessionCommand) {
        if (!command.refreshToken.startsWith('valid-')) throw new TokenInvalidError();
        return {
          accessToken: 'access-token',
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000),
          refreshToken: command.refreshToken,
          refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
        };
      },
    };
    const loginStub = {
      async execute() {
        throw new InvalidCredentialsError();
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(APP_THROTTLERS)],
      controllers: [AuthenticationController],
      providers: [
        PinoLoggerService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
        { provide: RefreshSessionUseCase, useValue: refreshSessionStub },
        { provide: LoginUseCase, useValue: loginStub },
        { provide: RegisterUseCase, useValue: {} },
        { provide: LogoutUseCase, useValue: {} },
        { provide: ForgotPasswordUseCase, useValue: {} },
        { provide: ResetPasswordUseCase, useValue: {} },
        { provide: VerifyEmailUseCase, useValue: {} },
        { provide: ChangePasswordUseCase, useValue: {} },
        { provide: GetCurrentSessionUseCase, useValue: {} },
        { provide: ResendVerificationUseCase, useValue: {} },
        { provide: JWT_SIGNER, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 'test' } },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    (app as NestExpressApplication).set('trust proxy', 1);
    app.use(cookieParser());
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();

    process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      logLines.push(chunk.toString());
      return (originalWrite as (...args: unknown[]) => boolean)(chunk, ...rest);
    }) as typeof process.stdout.write;
  });

  after(async () => {
    process.stdout.write = originalWrite;
    await app.close();
  });

  const refresh = (client: string, token?: string, proxy = PROXY) => {
    const call = request(app.getHttpServer()).post('/auth/refresh').set('X-Forwarded-For', viaProxy(client, proxy));
    return token ? call.set('Cookie', cookie(token)) : call;
  };

  it('gives two users behind the same proxy separate refresh buckets', async () => {
    for (let i = 0; i < 5; i += 1) {
      await refresh('198.51.100.1', 'valid-user-a-token').expect(200);
    }
    // User A has spent their 5; user B, behind the same proxy, still refreshes.
    for (let i = 0; i < 5; i += 1) {
      await refresh('198.51.100.2', 'valid-user-b-token').expect(200);
    }
  });

  it('still throttles repeated refreshes with the same token, from any client address', async () => {
    for (let i = 0; i < 5; i += 1) {
      await refresh(`198.51.100.${10 + i}`, 'valid-repeated-token', `192.0.2.${10 + i}`).expect(200);
    }
    const response = await refresh('198.51.100.99', 'valid-repeated-token', '192.0.2.99').expect(429);
    assert.equal(response.body.error.requestId !== undefined, true);
  });

  it('falls back to the per-IP bucket (5/min) when there is no refresh cookie, as before', async () => {
    for (let i = 0; i < 5; i += 1) {
      await refresh('198.51.100.20', undefined, '192.0.2.50').expect(401);
    }
    await refresh('198.51.100.21', undefined, '192.0.2.50').expect(429);
    // Another proxy address is a different bucket.
    await refresh('198.51.100.22', undefined, '192.0.2.51').expect(401);
  });

  it('answers an invalid token with 401, and caps a flood of distinct forged tokens per IP (API-wide 100/min)', async () => {
    for (let i = 0; i < 100; i += 1) {
      await refresh('198.51.100.30', `forged-${i}`, '192.0.2.60').expect(401);
    }
    await refresh('198.51.100.30', 'forged-100', '192.0.2.60').expect(429);
  });

  it('keeps login throttled at 5/min per IP, whatever the email', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', viaProxy('198.51.100.40', '192.0.2.70'))
        .send({ email: `someone-${i}@example.com`, password: 'wrong-password-1' })
        .expect(401);
    }
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', viaProxy('198.51.100.41', '192.0.2.70'))
      .send({ email: 'someone-else@example.com', password: 'wrong-password-1' })
      .expect(429);
  });

  it('never writes a refresh token (or the cookie carrying it) to the logs', () => {
    const output = logLines.join('');
    assert.ok(output.length > 0, 'expected request and exception log lines to have been captured');
    for (const token of ['valid-user-a-token', 'valid-user-b-token', 'valid-repeated-token', 'forged-42']) {
      assert.equal(output.includes(token), false, `log output contains the refresh token "${token}"`);
    }
    assert.equal(output.includes(REFRESH_COOKIE_NAME), false, 'log output contains the refresh cookie');
  });
});
