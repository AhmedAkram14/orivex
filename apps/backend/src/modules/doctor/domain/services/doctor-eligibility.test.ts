import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ValidationError } from '../../../../shared/errors/app-error.js';
import { DoctorAgeOutOfRangeError, LicenseExpiredError } from '../exceptions/doctor-eligibility.error.js';
import { mapDoctorError } from '../../presentation/mappers/doctor-exception.mapper.js';

import { assertLicenseNotExpired, assertPractisingAge } from './doctor-eligibility.js';

// Noon in Cairo on 13 Oct 2026.
const NOW = new Date('2026-10-13T09:00:00Z');
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('assertPractisingAge', () => {
  it('accepts 22 on the day of the 22nd birthday and 90 up to the day before the 91st', () => {
    assert.doesNotThrow(() => assertPractisingAge(day('2004-10-13'), NOW));
    assert.doesNotThrow(() => assertPractisingAge(day('1935-10-14'), NOW));
  });

  it('rejects anyone not yet 22, or already 91', () => {
    assert.throws(() => assertPractisingAge(day('2004-10-14'), NOW), DoctorAgeOutOfRangeError);
    assert.throws(() => assertPractisingAge(day('2026-01-01'), NOW), DoctorAgeOutOfRangeError);
    assert.throws(() => assertPractisingAge(day('1935-10-13'), NOW), DoctorAgeOutOfRangeError);
  });

  it('leaves a missing date of birth to the personal-info step', () => {
    assert.doesNotThrow(() => assertPractisingAge(undefined, NOW));
  });
});

describe('assertLicenseNotExpired', () => {
  it('accepts today and any later day', () => {
    assert.doesNotThrow(() => assertLicenseNotExpired(day('2026-10-13'), NOW));
    assert.doesNotThrow(() => assertLicenseNotExpired(day('2031-01-01'), NOW));
    assert.doesNotThrow(() => assertLicenseNotExpired(undefined, NOW));
  });

  it('rejects any day before today', () => {
    assert.throws(() => assertLicenseNotExpired(day('2026-10-12'), NOW), LicenseExpiredError);
    assert.throws(() => assertLicenseNotExpired(day('2016-05-01'), NOW), LicenseExpiredError);
  });

  it("counts today in Cairo, not UTC: at 23:30 UTC on the 12th it is already the 13th in Cairo", () => {
    const lateUtc = new Date('2026-10-12T23:30:00Z');
    assert.throws(() => assertLicenseNotExpired(day('2026-10-12'), lateUtc), LicenseExpiredError);
    assert.doesNotThrow(() => assertLicenseNotExpired(day('2026-10-13'), lateUtc));
  });
});

describe('mapDoctorError', () => {
  it('maps both rules to a 422 with their own codes', () => {
    const age = mapDoctorError(new DoctorAgeOutOfRangeError('x'));
    const license = mapDoctorError(new LicenseExpiredError('x'));
    assert.ok(age instanceof ValidationError && license instanceof ValidationError);
    assert.equal((age as ValidationError).code, 'DOCTOR_AGE_OUT_OF_RANGE');
    assert.equal((license as ValidationError).code, 'LICENSE_EXPIRED');
  });
});
