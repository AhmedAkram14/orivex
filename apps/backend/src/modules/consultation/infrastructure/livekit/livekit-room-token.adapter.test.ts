import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TokenVerifier } from 'livekit-server-sdk';

import { LiveKitRoomTokenAdapter } from './livekit-room-token.adapter.js';

const API_KEY = 'test-api-key';
const API_SECRET = 'test-api-secret-long-enough-for-hmac';
const LIVEKIT_URL = 'wss://orivex-test.livekit.cloud';

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as Record<string, unknown>;
}

describe('LiveKitRoomTokenAdapter', () => {
  it('mints a token that verifies against the same api key/secret and grants roomJoin for the requested room', async () => {
    const adapter = new LiveKitRoomTokenAdapter(API_KEY, API_SECRET, LIVEKIT_URL);

    const result = await adapter.generateToken({
      roomName: 'consultation-11111111-1111-4111-8111-111111111111',
      identity: '22222222-2222-4222-8222-222222222222',
      displayName: 'Dr. Karim Adel',
      role: 'doctor',
    });

    assert.equal(result.url, LIVEKIT_URL);
    assert.ok(result.token.length > 0);

    const verifier = new TokenVerifier(API_KEY, API_SECRET);
    const claims = await verifier.verify(result.token);
    assert.equal(claims.sub, '22222222-2222-4222-8222-222222222222');
    assert.equal(claims.name, 'Dr. Karim Adel');
    assert.equal(claims.video?.room, 'consultation-11111111-1111-4111-8111-111111111111');
    assert.equal(claims.video?.roomJoin, true);
  });

  it('grants a doctor roomAdmin but never grants a patient roomAdmin', async () => {
    const adapter = new LiveKitRoomTokenAdapter(API_KEY, API_SECRET, LIVEKIT_URL);

    const doctorToken = await adapter.generateToken({
      roomName: 'consultation-abc',
      identity: 'doctor-account-1',
      displayName: 'Dr. Karim Adel',
      role: 'doctor',
    });
    const patientToken = await adapter.generateToken({
      roomName: 'consultation-abc',
      identity: 'patient-account-1',
      displayName: 'Amina Youssef',
      role: 'patient',
    });

    const doctorPayload = decodeJwtPayload(doctorToken.token);
    const patientPayload = decodeJwtPayload(patientToken.token);

    assert.equal((doctorPayload.video as { roomAdmin?: boolean }).roomAdmin, true);
    assert.notEqual((patientPayload.video as { roomAdmin?: boolean }).roomAdmin, true);
  });

  it('grants both roles canPublish and canSubscribe -- a patient must be able to see and be seen', async () => {
    const adapter = new LiveKitRoomTokenAdapter(API_KEY, API_SECRET, LIVEKIT_URL);

    const result = await adapter.generateToken({
      roomName: 'consultation-abc',
      identity: 'patient-account-1',
      displayName: 'Amina Youssef',
      role: 'patient',
    });

    const payload = decodeJwtPayload(result.token) as { video?: { canPublish?: boolean; canSubscribe?: boolean } };
    assert.equal(payload.video?.canPublish, true);
    assert.equal(payload.video?.canSubscribe, true);
  });

  it('mints distinct tokens for two different identities in the same room (never a shared/reused token)', async () => {
    const adapter = new LiveKitRoomTokenAdapter(API_KEY, API_SECRET, LIVEKIT_URL);

    const first = await adapter.generateToken({
      roomName: 'consultation-abc',
      identity: 'doctor-account-1',
      displayName: 'Dr. Karim Adel',
      role: 'doctor',
    });
    const second = await adapter.generateToken({
      roomName: 'consultation-abc',
      identity: 'patient-account-1',
      displayName: 'Amina Youssef',
      role: 'patient',
    });

    assert.notEqual(first.token, second.token);
  });
});
