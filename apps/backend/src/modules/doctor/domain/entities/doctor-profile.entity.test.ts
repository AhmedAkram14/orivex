import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ProfessionalRank } from '../enums/professional-rank.enum.js';
import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';

import { DoctorProfile } from './doctor-profile.entity.js';

describe('DoctorProfile', () => {
  it('registers with the Stage O.3 fields left unset by default', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
    });

    assert.equal(profile.getSpecialtyId(), undefined);
    assert.equal(profile.getProfessionalRank(), undefined);
    assert.equal(profile.getLicenseExpiryDate(), undefined);
    assert.equal(profile.getDepartmentId(), undefined);
  });

  it('registers with specialtyId/professionalRank/licenseExpiryDate/hospitalId+departmentId set', () => {
    const licenseExpiryDate = new Date('2030-01-01');
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
      specialtyId: '22222222-2222-4222-8222-222222222222',
      professionalRank: ProfessionalRank.Specialist,
      licenseExpiryDate,
      hospitalId: '33333333-3333-4333-8333-333333333333',
      departmentId: '44444444-4444-4444-8444-444444444444',
    });

    assert.equal(profile.getSpecialtyId(), '22222222-2222-4222-8222-222222222222');
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
          specialty: 'Cardiology',
          departmentId: '44444444-4444-4444-8444-444444444444',
        }),
      DoctorDomainError,
    );
  });

  it('allows a hospitalId with no departmentId (independent practice within a hospital, no department chosen)', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
      hospitalId: '33333333-3333-4333-8333-333333333333',
    });

    assert.equal(profile.getHospitalId(), '33333333-3333-4333-8333-333333333333');
    assert.equal(profile.getDepartmentId(), undefined);
  });

  it('update() rejects clearing hospitalId while departmentId remains set', () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
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
      specialty: 'Cardiology',
      hospitalId: '33333333-3333-4333-8333-333333333333',
      departmentId: '44444444-4444-4444-8444-444444444444',
    });

    profile.update({ hospitalId: null, departmentId: null });

    assert.equal(profile.getHospitalId(), undefined);
    assert.equal(profile.getDepartmentId(), undefined);
  });
});
