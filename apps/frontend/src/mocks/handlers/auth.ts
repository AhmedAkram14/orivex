import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { AUTH_PATHS } from '@/features/auth/api/paths';
import { AUTH_ERROR_CODES } from '@/features/auth/api/types';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@/features/auth/api/types';
import {
  clearFailedAttempts,
  endSession,
  findAccountByEmail,
  getCurrentAccount,
  getDeviceSessions,
  getLoginHistory,
  isRateLimited,
  isValidAccessToken,
  recordFailedAttempt,
  refreshAccessToken,
  revokeDeviceSession,
  startSession,
  toAuthenticatedUser,
} from '@/mocks/auth-store';

/**
 * Mocks the `/auth/*` contract `features/auth/api/auth-api.ts` calls.
 * Reset-link tokens follow a fixed convention since no real email is ever
 * sent: a token starting with `valid-` succeeds, `expired-` yields
 * TOKEN_EXPIRED, anything else yields TOKEN_INVALID.
 */
const base = () => env.apiBaseUrl;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message, requestId: 'mock-request', timestamp: new Date().toISOString() } },
    { status },
  );
}

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
}

export const authHandlers = [
  http.post(`${base()}${AUTH_PATHS.login}`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    const account = findAccountByEmail(body.email);

    if (isRateLimited(body.email)) {
      return errorResponse(429, AUTH_ERROR_CODES.tooManyAttempts, 'Too many login attempts. Please try again later.');
    }

    if (!account || account.password !== body.password) {
      recordFailedAttempt(body.email);
      return errorResponse(401, AUTH_ERROR_CODES.invalidCredentials, 'Incorrect email or password.');
    }

    if (account.locked) {
      return errorResponse(403, AUTH_ERROR_CODES.accountLocked, 'This account has been locked.');
    }

    if (!account.emailVerified) {
      return errorResponse(403, AUTH_ERROR_CODES.emailNotVerified, 'Please verify your email address before signing in.');
    }

    clearFailedAttempts(body.email);
    const accessToken = startSession(account);
    return HttpResponse.json({
      data: {
        user: toAuthenticatedUser(account),
        accessToken,
        accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        mfaRequired: false,
      },
    });
  }),

  http.post(`${base()}${AUTH_PATHS.register}`, async ({ request }) => {
    const body = (await request.json()) as RegisterRequest;
    if (findAccountByEmail(body.email)) {
      return errorResponse(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    }
    return HttpResponse.json({ data: { status: 'verification_required', email: body.email } });
  }),

  http.post(`${base()}${AUTH_PATHS.forgotPassword}`, async ({ request }) => {
    const body = (await request.json()) as ForgotPasswordRequest;
    // Deliberately always succeeds regardless of whether the email exists
    // -- a real backend must not leak account existence through this
    // endpoint's response, and the mock is built to the same contract.
    void body;
    return HttpResponse.json({ data: { status: 'sent' } });
  }),

  http.post(`${base()}${AUTH_PATHS.resetPassword}`, async ({ request }) => {
    const body = (await request.json()) as ResetPasswordRequest;
    if (body.token.startsWith('expired-')) {
      return errorResponse(410, AUTH_ERROR_CODES.tokenExpired, 'This reset link has expired.');
    }
    if (!body.token.startsWith('valid-')) {
      return errorResponse(400, AUTH_ERROR_CODES.tokenInvalid, 'This reset link is invalid.');
    }
    return HttpResponse.json({ data: { status: 'reset' } });
  }),

  http.post(`${base()}${AUTH_PATHS.verifyEmail}`, async ({ request }) => {
    const body = (await request.json()) as VerifyEmailRequest;
    if (body.token.startsWith('expired-')) {
      return errorResponse(410, AUTH_ERROR_CODES.tokenExpired, 'This verification link has expired.');
    }
    if (!body.token.startsWith('valid-')) {
      return errorResponse(400, AUTH_ERROR_CODES.tokenInvalid, 'This verification link is invalid.');
    }
    return HttpResponse.json({ data: { status: 'verified' } });
  }),

  http.post(`${base()}${AUTH_PATHS.resendVerification}`, async ({ request }) => {
    const body = (await request.json()) as ResendVerificationRequest;
    void body;
    return HttpResponse.json({ data: { status: 'sent' } });
  }),

  http.post(`${base()}${AUTH_PATHS.refresh}`, () => {
    const nextToken = refreshAccessToken();
    if (!nextToken) {
      return errorResponse(401, AUTH_ERROR_CODES.tokenInvalid, 'No active session to refresh.');
    }
    return HttpResponse.json({
      data: { accessToken: nextToken, accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString() },
    });
  }),

  http.get(`${base()}${AUTH_PATHS.session}`, ({ request }) => {
    const token = bearerToken(request);
    if (!isValidAccessToken(token)) {
      return HttpResponse.json({ data: null });
    }
    const account = getCurrentAccount();
    if (!account) return HttpResponse.json({ data: null });
    return HttpResponse.json({ data: { user: toAuthenticatedUser(account) } });
  }),

  http.post(`${base()}${AUTH_PATHS.logout}`, () => {
    endSession();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base()}${AUTH_PATHS.logoutAll}`, () => {
    endSession();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base()}${AUTH_PATHS.deviceSessions}`, ({ request }) => {
    const token = bearerToken(request);
    if (!isValidAccessToken(token)) {
      return errorResponse(401, AUTH_ERROR_CODES.tokenInvalid, 'Not authenticated.');
    }
    return HttpResponse.json({ data: getDeviceSessions() });
  }),

  http.delete(`${base()}${AUTH_PATHS.deviceSessions}/:sessionId`, ({ request, params }) => {
    const token = bearerToken(request);
    if (!isValidAccessToken(token)) {
      return errorResponse(401, AUTH_ERROR_CODES.tokenInvalid, 'Not authenticated.');
    }
    revokeDeviceSession(params.sessionId as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base()}${AUTH_PATHS.loginHistory}`, ({ request }) => {
    const token = bearerToken(request);
    if (!isValidAccessToken(token)) {
      return errorResponse(401, AUTH_ERROR_CODES.tokenInvalid, 'Not authenticated.');
    }
    return HttpResponse.json({ data: getLoginHistory() });
  }),
];
