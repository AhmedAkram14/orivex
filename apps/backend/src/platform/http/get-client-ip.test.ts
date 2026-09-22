import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getClientIp } from './get-client-ip.js';

describe('getClientIp', () => {
  it('prefers the first entry of x-forwarded-for over everything else', () => {
    const ip = getClientIp({
      headers: { 'x-forwarded-for': '203.0.113.5, 10.27.0.1', 'x-real-ip': '198.51.100.9' },
      ip: '::ffff:10.27.0.1',
    });
    assert.equal(ip, '203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const ip = getClientIp({ headers: { 'x-real-ip': '198.51.100.9' }, ip: '::ffff:10.27.0.1' });
    assert.equal(ip, '198.51.100.9');
  });

  it('falls back to x-vercel-forwarded-for when the other headers are absent', () => {
    const ip = getClientIp({ headers: { 'x-vercel-forwarded-for': '203.0.113.7' }, ip: '::ffff:10.27.0.1' });
    assert.equal(ip, '203.0.113.7');
  });

  it('falls back to req.ip when no forwarding headers are present', () => {
    const ip = getClientIp({ headers: {}, ip: '203.0.113.9' });
    assert.equal(ip, '203.0.113.9');
  });

  it('strips the ::ffff: IPv4-mapped prefix', () => {
    const ip = getClientIp({ headers: {}, ip: '::ffff:203.0.113.9' });
    assert.equal(ip, '203.0.113.9');
  });

  it('treats an array header value as its first entry', () => {
    const ip = getClientIp({ headers: { 'x-forwarded-for': ['203.0.113.5', '203.0.113.6'] }, ip: undefined });
    assert.equal(ip, '203.0.113.5');
  });

  it('returns an empty string when nothing is available', () => {
    const ip = getClientIp({ headers: {}, ip: undefined });
    assert.equal(ip, '');
  });
});
