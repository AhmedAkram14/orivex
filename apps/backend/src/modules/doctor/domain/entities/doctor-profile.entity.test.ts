import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ProfessionalRank } from '../enums/professional-rank.enum.js';
import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';

import { DoctorProfile } from './doctor-profile.entity.js';

const SPECIALTY_ID = '22222222-2222-4222-8222-222222222222';

describe('DoctorProfile', () => {
  it('registers with the optional Stage O.3 fields left unset by default', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
    });

    assert.equal(profile.getSpecialtyId(), SPECIALTY_ID);
    assert.equal(profile.getProfessionalRank(), undefined);
    assert.equal(profile.getLicenseExpiryDate(), undefined);
    assert.equal(profile.getDepartmentId(), undefined);
  });

  it('registers with professionalRank/licenseExpiryDate/hospitalId+departmentId set', () => {
    const licenseExpiryDate = new Date('2030-01-01');
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      professionalRank: ProfessionalRank.Specialist,
      licenseExpiryDate,
      hospitalId: '33333333-3333-4333-8333-333333333333',
      departmentId: '44444444-4444-4444-8444-444444444444',
    });

    assert.equal(profile.getSpecialtyId(), SPECIALTY_ID);
    assert.equal(profile.getProfessionalRank(), ProfessionalRank.Specialist);
    assert.deepEqual(profile.getLicenseExpiryDate(), licenseExpiryDate);
    assert.equal(profile.getDepartmentId(), '44444444-4444-4444-8444-444444444444');
  });

  it('rejects registering with departmentId but no hospitalId', () => {
    assert.throws(
      () =>
        DoctorProfile.register({
          accountId: '11111111-1111-4111-8111-111111111111',
          licenseNumber: 'LIC-1',
          specialtyId: SPECIALTY_ID,
          departmentId: '44444444-4444-4444-8444-444444444444',
        }),
      DoctorDomainError,
    );
  });

  it('allows a hospitalId with no departmentId (independent practice within a hospital, no department chosen)', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      hospitalId: '33333333-3333-4333-8333-333333333333',
    });

    assert.equal(profile.getHospitalId(), '33333333-3333-4333-8333-333333333333');
    assert.equal(profile.getDepartmentId(), undefined);
  });

  it('update() changes specialtyId', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
    });

    profile.update({ specialtyId: '55555555-5555-4555-8555-555555555555' });

    assert.equal(profile.getSpecialtyId(), '55555555-5555-4555-8555-555555555555');
  });

  it('update() rejects clearing hospitalId while departmentId remains set', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      hospitalId: '33333333-3333-4333-8333-333333333333',
      departmentId: '44444444-4444-4444-8444-444444444444',
    });

    assert.throws(() => profile.update({ hospitalId: null }), DoctorDomainError);
    // Neither field was mutated -- validate-then-assign, not partial mutation.
    assert.equal(profile.getHospitalId(), '33333333-3333-4333-8333-333333333333');
    assert.equal(profile.getDepartmentId(), '44444444-4444-4444-8444-444444444444');
  });

  it('update() allows clearing both hospitalId and departmentId together', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      hospitalId: '33333333-3333-4333-8333-333333333333',
      departmentId: '44444444-4444-4444-8444-444444444444',
    });

    profile.update({ hospitalId: null, departmentId: null });

    assert.equal(profile.getHospitalId(), undefined);
    assert.equal(profile.getDepartmentId(), undefined);
  });

  it('registers with bufferMinutesOverride/autoApproveFreeBookings left at their defaults', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
    });

    assert.equal(profile.getBufferMinutesOverride(), undefined);
    assert.equal(profile.getAutoApproveFreeBookings(), false);
  });

  it('registers with bufferMinutesOverride/autoApproveFreeBookings explicitly set', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      bufferMinutesOverride: 15,
      autoApproveFreeBookings: true,
    });

    assert.equal(profile.getBufferMinutesOverride(), 15);
    assert.equal(profile.getAutoApproveFreeBookings(), true);
  });

  it('rejects registering with a negative bufferMinutesOverride', () => {
    assert.throws(
      () =>
        DoctorProfile.register({
          accountId: '11111111-1111-4111-8111-111111111111',
          licenseNumber: 'LIC-1',
          specialtyId: SPECIALTY_ID,
          bufferMinutesOverride: -1,
        }),
      DoctorDomainError,
    );
  });

  it('rejects registering with a non-integer bufferMinutesOverride', () => {
    assert.throws(
      () =>
        DoctorProfile.register({
          accountId: '11111111-1111-4111-8111-111111111111',
          licenseNumber: 'LIC-1',
          specialtyId: SPECIALTY_ID,
          bufferMinutesOverride: 5.5,
        }),
      DoctorDomainError,
    );
  });

  it('allows a bufferMinutesOverride of exactly 0 (boundary)', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      bufferMinutesOverride: 0,
    });

    assert.equal(profile.getBufferMinutesOverride(), 0);
  });

  it('update() sets bufferMinutesOverride and autoApproveFreeBookings', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
    });

    profile.update({ bufferMinutesOverride: 20, autoApproveFreeBookings: true });

    assert.equal(profile.getBufferMinutesOverride(), 20);
    assert.equal(profile.getAutoApproveFreeBookings(), true);
  });

  it('update() clears bufferMinutesOverride when explicitly set to null', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      bufferMinutesOverride: 20,
    });

    profile.update({ bufferMinutesOverride: null });

    assert.equal(profile.getBufferMinutesOverride(), undefined);
  });

  it('update() rejects a negative bufferMinutesOverride without persisting the change', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      bufferMinutesOverride: 20,
    });

    assert.throws(() => profile.update({ bufferMinutesOverride: -5 }), DoctorDomainError);
    assert.equal(profile.getBufferMinutesOverride(), 20);
  });

  it('update() can set autoApproveFreeBookings back to false', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      autoApproveFreeBookings: true,
    });

    profile.update({ autoApproveFreeBookings: false });

    assert.equal(profile.getAutoApproveFreeBookings(), false);
  });
});
