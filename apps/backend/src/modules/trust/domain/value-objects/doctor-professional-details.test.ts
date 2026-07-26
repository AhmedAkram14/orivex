import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorVerifiedEvent } from '../events/doctor-verified.event.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';
import { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

import { DoctorProfessionalDetails } from './doctor-professional-details.js';

describe('DoctorProfessionalDetails', () => {
  it('creates with a trimmed licenseNumber/specialtyCode', () => {
    const details = DoctorProfessionalDetails.create('  LIC-1  ', '  cardiology  ');

    assert.equal(details.getLicenseNumber(), 'LIC-1');
    assert.equal(details.getSpecialtyCode(), 'cardiology');
  });

  it('rejects an empty licenseNumber', () => {
    assert.throws(() => DoctorProfessionalDetails.create('', 'cardiology'), TrustDomainError);
  });

  it('rejects an empty specialtyCode', () => {
    assert.throws(() => DoctorProfessionalDetails.create('LIC-1', '  '), TrustDomainError);
  });

  it('reports subjectType Doctor', () => {
    const details = DoctorProfessionalDetails.create('LIC-1', 'cardiology');
    assert.equal(details.getSubjectType(), VerificationSubjectType.Doctor);
  });

  it('getApprovalEvent returns a DoctorVerifiedEvent carrying the given subjectAccountId/verificationCaseId', () => {
    const details = DoctorProfessionalDetails.create('LIC-1', 'cardiology');

    const event = details.getApprovalEvent('account-1', 'case-1');

    assert.ok(event instanceof DoctorVerifiedEvent);
    assert.equal(event.subjectAccountId, 'account-1');
    assert.equal(event.verificationCaseId, 'case-1');
  });
});
