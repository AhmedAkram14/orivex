import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';

import { Argon2PasswordHasher } from './argon2-password-hasher.js';

const CONFIG_VALUES: Partial<EnvConfig> = {
  ARGON2_MEMORY_COST_KIB: 8192,
  ARGON2_TIME_COST: 1,
  ARGON2_PARALLELISM: 1,
};

function buildFakeConfigService(): ConfigService<EnvConfig, true> {
  return {
    get: (key: keyof EnvConfig) => CONFIG_VALUES[key],
  } as never;
}

describe('Argon2PasswordHasher', () => {
  it('hashes and verifies a password round-trip', async () => {
    const hasher = new Argon2PasswordHasher(buildFakeConfigService());

    const hash = await hasher.hash('Str0ngPassword');

    assert.ok(await hasher.verify('Str0ngPassword', hash));
    assert.equal(await hasher.verify('WrongPassword', hash), false);
  });

  it('produces a different hash each time for the same password (salt uniqueness)', async () => {
    const hasher = new Argon2PasswordHasher(buildFakeConfigService());

    const hashA = await hasher.hash('Str0ngPassword');
    const hashB = await hasher.hash('Str0ngPassword');

    assert.notEqual(hashA, hashB);
  });
});
