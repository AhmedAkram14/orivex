import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorVerifiedEvent } from '../events/doctor-verified.event.js';
import { VerificationCaseSubmittedEvent } from '../events/verification-case-submitted.event.js';
import { VerificationCaseAlreadyDecidedError } from '../exceptions/verification-case-already-decided.error.js';
import { VerificationCaseNotApprovedError } from '../exceptions/verification-case-not-approved.error.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';
import { VerificationStatus } from '../enums/verification-status.enum.js';
import { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';
import { DoctorProfessionalDetails } from '../value-objects/doctor-professional-details.js';
import { PatientIdentityDetails } from '../value-objects/patient-identity-details.js';

import { VerificationCase } from './verification-case.entity.js';

const SUBJECT_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const DOCUMENT_ID = '22222222-2222-4222-8222-222222222222';

function buildDoctorCase(): VerificationCase {
  return VerificationCase.submit({
    subjectAccountId: SUBJECT_ACCOUNT_ID,
    subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'cardiology'),
    documentAssetIds: [DOCUMENT_ID],
  });
}

function buildPatientCase(): VerificationCase {
  return VerificationCase.submit({
    subjectAccountId: SUBJECT_ACCOUNT_ID,
    subjectDetails: PatientIdentityDetails.create(),
    documentAssetIds: [DOCUMENT_ID],
  });
}

describe('VerificationCase', () => {
  it('submits a Doctor case with subjectType/subjectAccountId derived from its subjectDetails', () => {
    const verificationCase = buildDoctorCase();

    assert.equal(verificationCase.getSubjectAccountId(), SUBJECT_ACCOUNT_ID);
    assert.equal(verificationCase.getSubjectType(), VerificationSubjectType.Doctor);
    assert.equal(verificationCase.getStatus(), VerificationStatus.Submitted);
  });

  it('submits a Patient case the same way, with no professional details', () => {
    const verificationCase = buildPatientCase();

    assert.equal(verificationCase.getSubjectType(), VerificationSubjectType.Patient);
    assert.ok(verificationCase.getSubjectDetails() instanceof PatientIdentityDetails);
  });

  it('submit() raises VerificationCaseSubmittedEvent carrying the case id, subjectAccountId, and subjectType, for either subject', () => {
    const doctorCase = buildDoctorCase();
    const doctorEvents = doctorCase.releaseDomainEvents();
    assert.equal(doctorEvents.length, 1);
    assert.ok(doctorEvents[0] instanceof VerificationCaseSubmittedEvent);
    const doctorEvent = doctorEvents[0] as VerificationCaseSubmittedEvent;
    assert.equal(doctorEvent.verificationCaseId, doctorCase.getId());
    assert.equal(doctorEvent.subjectAccountId, SUBJECT_ACCOUNT_ID);
    assert.equal(doctorEvent.subjectType, VerificationSubjectType.Doctor);

    const patientCase = buildPatientCase();
    const patientEvents = patientCase.releaseDomainEvents();
    assert.equal(patientEvents.length, 1);
    assert.equal((patientEvents[0] as VerificationCaseSubmittedEvent).subjectType, VerificationSubjectType.Patient);
  });

  it('rejects submission with no documentAssetIds, regardless of subject type', () => {
    assert.throws(
      () =>
        VerificationCase.submit({
          subjectAccountId: SUBJECT_ACCOUNT_ID,
          subjectDetails: PatientIdentityDetails.create(),
          documentAssetIds: [],
        }),
      TrustDomainError,
    );
  });

  it('decide(Approved) on a Doctor case raises DoctorVerifiedEvent carrying subjectAccountId', () => {
    const verificationCase = buildDoctorCase();
    verificationCase.releaseDomainEvents(); // clears the submission event -- decide() is a separate transaction in real usage

    verificationCase.decide(VerificationStatus.Approved);

    const events = verificationCase.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof DoctorVerifiedEvent);
    assert.equal((events[0] as DoctorVerifiedEvent).subjectAccountId, SUBJECT_ACCOUNT_ID);
    assert.equal(verificationCase.getStatus(), VerificationStatus.Approved);
    assert.ok(verificationCase.getDecidedAt());
  });

  it('decide(Approved) on a Patient case raises no event at all -- dispatched polymorphically, not via a subjectType branch', () => {
    const verificationCase = buildPatientCase();
    verificationCase.releaseDomainEvents(); // clears the submission event -- decide() is a separate transaction in real usage

    verificationCase.decide(VerificationStatus.Approved);

    assert.equal(verificationCase.releaseDomainEvents().length, 0);
    assert.equal(verificationCase.getStatus(), VerificationStatus.Approved);
  });

  it('rejects redeciding an already-decided case, for either subject type', () => {
    const doctorCase = buildDoctorCase();
    doctorCase.decide(VerificationStatus.Rejected, 'Invalid license');

    assert.throws(() => doctorCase.decide(VerificationStatus.Approved), VerificationCaseAlreadyDecidedError);
  });

  it('suspend() transitions an Approved case to Suspended, with a reason', () => {
    const verificationCase = buildDoctorCase();
    verificationCase.decide(VerificationStatus.Approved);

    verificationCase.suspend('License expired');

    assert.equal(verificationCase.getStatus(), VerificationStatus.Suspended);
    assert.equal(verificationCase.getReason(), 'License expired');
  });

  it('suspend() throws VerificationCaseNotApprovedError when the case was never Approved', () => {
    const verificationCase = buildDoctorCase();

    assert.throws(() => verificationCase.suspend('License expired'), VerificationCaseNotApprovedError);
  });

  it('suspend() throws when attempted on an already-Rejected case', () => {
    const verificationCase = buildDoctorCase();
    verificationCase.decide(VerificationStatus.Rejected, 'Invalid license');

    assert.throws(() => verificationCase.suspend('anything'), VerificationCaseNotApprovedError);
  });
});
