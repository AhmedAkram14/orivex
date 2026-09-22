import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveIpLocation } from './resolve-ip-location.js';

describe('resolveIpLocation', () => {
  it('returns null for a private IP', () => {
    assert.equal(resolveIpLocation('10.27.0.1'), null);
  });

  it('returns null for localhost', () => {
    assert.equal(resolveIpLocation('127.0.0.1'), null);
  });

  it('returns null for an empty string', () => {
    assert.equal(resolveIpLocation(''), null);
  });

  it('resolves a country for a known public IP', () => {
    const location = resolveIpLocation('8.8.8.8');
    assert.ok(location);
    assert.equal(location.country, 'US');
  });
});
