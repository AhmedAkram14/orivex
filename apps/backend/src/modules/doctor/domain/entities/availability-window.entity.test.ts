import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';
import { AvailabilityWindowStatus } from '../enums/availability-window-status.enum.js';
import { ConsultationPricing } from '../value-objects/consultation-pricing.value-object.js';
import { Money } from '../value-objects/money.value-object.js';

import { AvailabilityWindow } from './availability-window.entity.js';

function defineWindow(): AvailabilityWindow {
  const startTime = new Date(Date.now() + 60 * 60_000);
  const endTime = new Date(startTime.getTime() + 30 * 60_000);
  return AvailabilityWindow.define({
    doctorId: '11111111-1111-4111-8111-111111111111',
    startTime,
    endTime,
    pricing: ConsultationPricing.paid(Money.create(500, 'EGP')),
  });
}

describe('AvailabilityWindow', () => {
  it('defines an Open window and records AvailabilityChanged', () => {
    const window = defineWindow();

    assert.equal(window.getStatus(), AvailabilityWindowStatus.Open);
    assert.equal(window.getVersion(), 1);
    assert.equal(window.releaseDomainEvents().length, 1);
  });

  it('rejects startTime at or after endTime', () => {
    const startTime = new Date(Date.now() + 60 * 60_000);
    assert.throws(
      () =>
        AvailabilityWindow.define({
          doctorId: '11111111-1111-4111-8111-111111111111',
          startTime,
          endTime: startTime,
          pricing: ConsultationPricing.free(),
        }),
      DoctorDomainError,
    );
  });

  it('rejects a startTime in the past', () => {
    const past = new Date(Date.now() - 60_000);
    assert.throws(
      () =>
        AvailabilityWindow.define({
          doctorId: '11111111-1111-4111-8111-111111111111',
          startTime: past,
          endTime: new Date(past.getTime() + 60_000),
          pricing: ConsultationPricing.free(),
        }),
      DoctorDomainError,
    );
  });

  it('holds an Open window, then confirms it', () => {
    const window = defineWindow();
    window.releaseDomainEvents();

    window.hold();
    assert.equal(window.getStatus(), AvailabilityWindowStatus.Held);
    assert.ok(window.getHoldExpiresAt());

    window.confirm();
    assert.equal(window.getStatus(), AvailabilityWindowStatus.Booked);
    assert.equal(window.getHoldExpiresAt(), undefined);
  });

  it('rejects holding an already-held, non-expired window', () => {
    const window = defineWindow();
    window.hold();

    assert.throws(() => window.hold(), DoctorDomainError);
  });

  it('allows re-holding once the existing hold has expired', () => {
    const window = defineWindow();
    const holdTime = new Date();
    window.hold(holdTime, 15);

    const afterExpiry = new Date(holdTime.getTime() + 16 * 60_000);
    window.hold(afterExpiry, 15);

    assert.equal(window.getStatus(), AvailabilityWindowStatus.Held);
  });

  it('rejects confirming an expired hold', () => {
    const window = defineWindow();
    const holdTime = new Date();
    window.hold(holdTime, 15);

    const afterExpiry = new Date(holdTime.getTime() + 16 * 60_000);
    assert.throws(() => window.confirm(afterExpiry), DoctorDomainError);
  });

  it('releases a held window back to Open', () => {
    const window = defineWindow();
    window.hold();

    window.release();

    assert.equal(window.getStatus(), AvailabilityWindowStatus.Open);
    assert.equal(window.getHoldExpiresAt(), undefined);
  });

  it('rejects releasing or confirming a window that is not held', () => {
    const window = defineWindow();

    assert.throws(() => window.release(), DoctorDomainError);
    assert.throws(() => window.confirm(), DoctorDomainError);
  });

  it('rejects holding an already-booked window', () => {
    const window = defineWindow();
    window.hold();
    window.confirm();

    assert.throws(() => window.hold(), DoctorDomainError);
  });
});
