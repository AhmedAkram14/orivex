import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsentState } from '../enums/consent-state.enum.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';

import { ConsentRecord } from './consent-record.entity.js';

const VALID_PROPS = {
  patientId: '11111111-1111-4111-8111-111111111111',
  doctorId: '22222222-2222-4222-8222-222222222222',
  scopeCategoryId: '33333333-3333-4333-8333-333333333333',
  scopeCategoryCode: 'general',
  state: ConsentState.Revoked,
  previousVersionNumber: 0,
  legalBasisVersion: 'v1',
};

describe('ConsentRecord.recordChange', () => {
  it('produces the next version number and records a matching domain event', () => {
    const record = ConsentRecord.recordChange(VALID_PROPS);

    assert.equal(record.getVersionNumber(), 1);
    assert.equal(record.getState(), ConsentState.Revoked);

    const events = record.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].eventName, 'trust.consent.revoked');
    // releaseDomainEvents() empties the buffer -- a second call must never
    // re-deliver the same event.
    assert.equal(record.releaseDomainEvents().length, 0);
  });

  it('rejects an empty patientId', () => {
    assert.throws(() => ConsentRecord.recordChange({ ...VALID_PROPS, patientId: '' }), TrustDomainError);
  });

  it('rejects an empty doctorId', () => {
    assert.throws(() => ConsentRecord.recordChange({ ...VALID_PROPS, doctorId: '' }), TrustDomainError);
  });

  it('rejects a negative previousVersionNumber', () => {
    assert.throws(() => ConsentRecord.recordChange({ ...VALID_PROPS, previousVersionNumber: -1 }), TrustDomainError);
  });

  it('rejects an empty legalBasisVersion', () => {
    assert.throws(() => ConsentRecord.recordChange({ ...VALID_PROPS, legalBasisVersion: '' }), TrustDomainError);
  });
});
