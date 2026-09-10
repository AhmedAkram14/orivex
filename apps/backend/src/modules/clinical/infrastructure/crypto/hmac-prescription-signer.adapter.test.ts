import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HmacPrescriptionSignerAdapter } from './hmac-prescription-signer.adapter.js';

class FakeConfigService {
  get(): string {
    return 'a-test-signing-secret-that-is-at-least-32-characters-long';
  }
}

function buildAdapter(): HmacPrescriptionSignerAdapter {
  return new HmacPrescriptionSignerAdapter(new FakeConfigService() as never);
}

const BASE_REQUEST = {
  consultationSessionId: '11111111-1111-4111-8111-111111111111',
  diagnosisNodeId: '22222222-2222-4222-8222-222222222222',
  authoringDoctorId: '33333333-3333-4333-8333-333333333333',
  lineItems: [{ drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 }],
  signedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('HmacPrescriptionSignerAdapter', () => {
  it('produces a deterministic signature for identical content', () => {
    const adapter = buildAdapter();
    const first = adapter.sign(BASE_REQUEST);
    const second = adapter.sign(BASE_REQUEST);
    assert.equal(first.signatureHash, second.signatureHash);
    assert.equal(first.verificationCode, second.verificationCode);
  });

  it('produces a different signature when the content changes', () => {
    const adapter = buildAdapter();
    const first = adapter.sign(BASE_REQUEST);
    const second = adapter.sign({ ...BASE_REQUEST, diagnosisNodeId: '99999999-9999-4999-8999-999999999999' });
    assert.notEqual(first.signatureHash, second.signatureHash);
  });

  it('is insensitive to line item ordering (canonicalized before signing)', () => {
    const adapter = buildAdapter();
    const twoItems = {
      ...BASE_REQUEST,
      lineItems: [
        { drugCatalogId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', dosage: '10mg', frequency: 'twice daily', durationDays: 14 },
        { drugCatalogId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', dosage: '5mg', frequency: 'once daily', durationDays: 30 },
      ],
    };
    const reversed = { ...twoItems, lineItems: [...twoItems.lineItems].reverse() };
    const first = adapter.sign(twoItems);
    const second = adapter.sign(reversed);
    assert.equal(first.signatureHash, second.signatureHash);
  });

  it('derives the verification code from the signature itself, formatted in dash-separated groups', () => {
    const adapter = buildAdapter();
    const result = adapter.sign(BASE_REQUEST);
    assert.match(result.verificationCode, /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    assert.equal(result.verificationCode.replace(/-/g, '').toLowerCase(), result.signatureHash.slice(0, 16));
  });
});
