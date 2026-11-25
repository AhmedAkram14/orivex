import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateEnv } from './env.schema.js';

const requiredEnvironment = {
  CORS_ORIGINS: 'https://orivex-eg.vercel.app',
  DATABASE_URL: 'postgresql://demo:demo@localhost:5432/orivex',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  PRESCRIPTION_SIGNING_SECRET: 'b'.repeat(32),
};

describe('validateEnv preview storage configuration', () => {
  it('allows preview mode without object storage', () => {
    const config = validateEnv({ ...requiredEnvironment, PREVIEW_MODE: 'true' });

    assert.equal(config.PREVIEW_MODE, true);
    assert.equal(config.S3_ENDPOINT, undefined);
  });

  it('still requires object storage outside preview mode', () => {
    assert.throws(() => validateEnv(requiredEnvironment), /S3 storage is required unless PREVIEW_MODE=true/);
  });

  it('rejects partial object storage configuration in preview mode', () => {
    assert.throws(
      () => validateEnv({ ...requiredEnvironment, PREVIEW_MODE: 'true', S3_ENDPOINT: 'https://storage.example' }),
      /Configure all S3 variables together/,
    );
  });
});
