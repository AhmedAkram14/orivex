import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { TokenInvalidError } from '../../domain/exceptions/token-invalid.error.js';

import { NestjsJwtSigner } from './nestjs-jwt-signer.js';

function buildFakeConfigService(ttlSeconds: number): ConfigService<EnvConfig, true> {
  return { get: () => ttlSeconds } as never;
}

describe('NestjsJwtSigner', () => {
  it('signs and verifies, round-tripping only accountId and role — no other claims', async () => {
    const jwtService = new JwtService({ secret: 'test-secret-at-least-32-characters-long-value' });
    const signer = new NestjsJwtSigner(jwtService, buildFakeConfigService(900));

    const signed = await signer.sign({ accountId: '11111111-1111-4111-8111-111111111111', role: 'patient' });
    const claims = await signer.verify(signed.token);

    assert.equal(claims.accountId, '11111111-1111-4111-8111-111111111111');
    assert.equal(claims.role, 'patient');
    assert.ok(signed.expiresAt instanceof Date);
    assert.ok(signed.expiresAt.getTime() > Date.now());
  });

  it('rejects a token signed with a different secret', async () => {
    const signerA = new NestjsJwtSigner(
      new JwtService({ secret: 'secret-a-at-least-32-characters-long-value' }),
      buildFakeConfigService(900),
    );
    const signerB = new NestjsJwtSigner(
      new JwtService({ secret: 'secret-b-at-least-32-characters-long-value' }),
      buildFakeConfigService(900),
    );

    const signed = await signerA.sign({ accountId: '22222222-2222-4222-8222-222222222222', role: 'doctor' });

    await assert.rejects(() => signerB.verify(signed.token), TokenInvalidError);
  });

  it('rejects a malformed token', async () => {
    const signer = new NestjsJwtSigner(
      new JwtService({ secret: 'test-secret-at-least-32-characters-long-value' }),
      buildFakeConfigService(900),
    );

    await assert.rejects(() => signer.verify('not-a-real-token'), TokenInvalidError);
  });
});
