import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

import { PatientIdentityDetails } from './patient-identity-details.js';

describe('PatientIdentityDetails', () => {
  it('reports subjectType Patient', () => {
    const details = PatientIdentityDetails.create();
    assert.equal(details.getSubjectType(), VerificationSubjectType.Patient);
  });

  it('getApprovalEvent returns undefined -- Patient verification never changes Account.role', () => {
    const details = PatientIdentityDetails.create();
    assert.equal(details.getApprovalEvent(), undefined);
  });
});
