import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCorsOrigins } from './cors-origins.js';

describe('parseCorsOrigins', () => {
  it('combines comma-separated origin settings and ignores empty entries', () => {
    assert.deepEqual(
      parseCorsOrigins('https://orivex-eg.vercel.app, https://old-preview.vercel.app', ' https://orivexeg.vercel.app, '),
      ['https://orivex-eg.vercel.app', 'https://old-preview.vercel.app', 'https://orivexeg.vercel.app'],
    );
  });
});
