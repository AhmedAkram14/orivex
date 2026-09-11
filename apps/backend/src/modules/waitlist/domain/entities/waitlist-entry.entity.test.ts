import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationType } from '../enums/consultation-type.enum.js';
import { WaitlistEntryStatus } from '../enums/waitlist-entry-status.enum.js';
import { WaitlistDomainError } from '../exceptions/waitlist-domain.error.js';

import { WaitlistEntry } from './waitlist-entry.entity.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

function join(overrides: Partial<{ consultationType: ConsultationType; earliestAcceptableAt: Date; latestAcceptableAt: Date }> = {}) {
  const now = Date.now();
  return WaitlistEntry.join({
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
    consultationType: overrides.consultationType,
    earliestAcceptableAt: overrides.earliestAcceptableAt ?? new Date(now + 24 * 60 * 60 * 1000),
    latestAcceptableAt: overrides.latestAcceptableAt ?? new Date(now + 7 * 24 * 60 * 60 * 1000),
  });
}

describe('WaitlistEntry', () => {
  it('joins with Waiting status and no notified/fulfilled/cancelled timestamps', () => {
    const entry = join();
    assert.equal(entry.getStatus(), WaitlistEntryStatus.Waiting);
    assert.equal(entry.getNotifiedAt(), undefined);
    assert.equal(entry.getFulfilledAt(), undefined);
    assert.equal(entry.getCancelledAt(), undefined);
  });

  it('rejects a range where latest is not after earliest', () => {
    const now = Date.now();
    assert.throws(
      () => join({ earliestAcceptableAt: new Date(now + 100), latestAcceptableAt: new Date(now + 100) }),
      WaitlistDomainError,
    );
  });

  it('rejects a range that has already fully passed', () => {
    const past = Date.now() - 10 * 24 * 60 * 60 * 1000;
    assert.throws(
      () => join({ earliestAcceptableAt: new Date(past), latestAcceptableAt: new Date(past + 1000) }),
      WaitlistDomainError,
    );
  });

  it('isMatchedBy: true for a window start inside the range with no type preference', () => {
    const now = Date.now();
    const entry = join({ earliestAcceptableAt: new Date(now + 1000), latestAcceptableAt: new Date(now + 10_000) });
    assert.equal(entry.isMatchedBy(new Date(now + 5000), ConsultationType.Free), true);
    assert.equal(entry.isMatchedBy(new Date(now + 5000), ConsultationType.Paid), true);
  });

  it('isMatchedBy: false for a window start outside the range', () => {
    const now = Date.now();
    const entry = join({ earliestAcceptableAt: new Date(now + 1000), latestAcceptableAt: new Date(now + 10_000) });
    assert.equal(entry.isMatchedBy(new Date(now + 20_000), ConsultationType.Free), false);
  });

  it('isMatchedBy: respects an explicit consultation-type preference', () => {
    const entry = join({ consultationType: ConsultationType.Free });
    const withinRange = new Date(entry.getEarliestAcceptableAt().getTime() + 1);
    assert.equal(entry.isMatchedBy(withinRange, ConsultationType.Free), true);
    assert.equal(entry.isMatchedBy(withinRange, ConsultationType.Paid), false);
  });

  it('isMatchedBy: false once no longer Waiting', () => {
    const entry = join();
    entry.notify();
    const withinRange = new Date(entry.getEarliestAcceptableAt().getTime() + 1);
    assert.equal(entry.isMatchedBy(withinRange, ConsultationType.Free), false);
  });

  it('notify() transitions Waiting -> Notified and stamps notifiedAt', () => {
    const entry = join();
    entry.notify();
    assert.equal(entry.getStatus(), WaitlistEntryStatus.Notified);
    assert.ok(entry.getNotifiedAt() instanceof Date);
  });

  it('notify() throws if not currently Waiting', () => {
    const entry = join();
    entry.notify();
    assert.throws(() => entry.notify(), WaitlistDomainError);
  });

  it('fulfill() is allowed from Waiting or Notified', () => {
    const entry = join();
    entry.fulfill();
    assert.equal(entry.getStatus(), WaitlistEntryStatus.Fulfilled);
  });

  it('cancel() throws once already Fulfilled or Cancelled', () => {
    const entry = join();
    entry.cancel();
    assert.equal(entry.getStatus(), WaitlistEntryStatus.Cancelled);
    assert.throws(() => entry.cancel(), WaitlistDomainError);
  });
});
