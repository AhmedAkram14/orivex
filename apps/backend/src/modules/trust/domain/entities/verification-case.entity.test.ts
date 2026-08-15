import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorVerifiedEvent } from '../events/doctor-verified.event.js';
import { VerificationCaseDecidedEvent } from '../events/verification-case-decided.event.js';
import { VerificationCaseSubmittedEvent } from '../events/verification-case-submitted.event.js';
import { VerificationCaseSuspendedEvent } from '../events/verification-case-suspended.event.js';
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

  it('decide(Approved) on a Doctor case raises both DoctorVerifiedEvent and the generic VerificationCaseDecidedEvent', () => {
    const verificationCase = buildDoctorCase();
    verificationCase.releaseDomainEvents(); // clears the submission event -- decide() is a separate transaction in real usage

    verificationCase.decide(VerificationStatus.Approved);

    const events = verificationCase.releaseDomainEvents();
    assert.equal(events.length, 2);
    const doctorVerifiedEvent = events.find((event): event is DoctorVerifiedEvent => event instanceof DoctorVerifiedEvent);
    assert.ok(doctorVerifiedEvent);
    assert.equal(doctorVerifiedEvent.subjectAccountId, SUBJECT_ACCOUNT_ID);
    const decidedEvent = events.find(
      (event): event is VerificationCaseDecidedEvent => event instanceof VerificationCaseDecidedEvent,
    );
    assert.ok(decidedEvent);
    assert.equal(decidedEvent.status, VerificationStatus.Approved);
    assert.equal(verificationCase.getStatus(), VerificationStatus.Approved);
    assert.ok(verificationCase.getDecidedAt());
  });

  it('decide(Approved) on a Patient case raises only the generic VerificationCaseDecidedEvent -- no DoctorVerifiedEvent, dispatched polymorphically not via a subjectType branch', () => {
    const verificationCase = buildPatientCase();
    verificationCase.releaseDomainEvents(); // clears the submission event -- decide() is a separate transaction in real usage

    verificationCase.decide(VerificationStatus.Approved);

    const events = verificationCase.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof VerificationCaseDecidedEvent);
    assert.equal((events[0] as VerificationCaseDecidedEvent).status, VerificationStatus.Approved);
    assert.equal(verificationCase.getStatus(), VerificationStatus.Approved);
  });

  it('decide(Rejected) raises VerificationCaseDecidedEvent carrying the reason, for either subject type', () => {
    const doctorCase = buildDoctorCase();
    doctorCase.releaseDomainEvents();

    doctorCase.decide(VerificationStatus.Rejected, 'Invalid license');

    const events = doctorCase.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof VerificationCaseDecidedEvent);
    const event = events[0] as VerificationCaseDecidedEvent;
    assert.equal(event.verificationCaseId, doctorCase.getId());
    assert.equal(event.subjectAccountId, SUBJECT_ACCOUNT_ID);
    assert.equal(event.subjectType, VerificationSubjectType.Doctor);
    assert.equal(event.status, VerificationStatus.Rejected);
    assert.equal(event.reason, 'Invalid license');

    const patientCase = buildPatientCase();
    patientCase.releaseDomainEvents();
    patientCase.decide(VerificationStatus.Rejected);
    const patientEvents = patientCase.releaseDomainEvents();
    assert.equal(patientEvents.length, 1);
    assert.equal((patientEvents[0] as VerificationCaseDecidedEvent).subjectType, VerificationSubjectType.Patient);
    assert.equal((patientEvents[0] as VerificationCaseDecidedEvent).reason, undefined);
  });

  it('decide(MoreInfoNeeded) also raises VerificationCaseDecidedEvent', () => {
    const verificationCase = buildDoctorCase();
    verificationCase.releaseDomainEvents();

    verificationCase.decide(VerificationStatus.MoreInfoNeeded, 'Please upload a clearer photo.');

    const events = verificationCase.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.equal((events[0] as VerificationCaseDecidedEvent).status, VerificationStatus.MoreInfoNeeded);
    assert.equal(verificationCase.getDecidedAt(), undefined); // only Approved/Rejected set decidedAt
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

  it('suspend() raises VerificationCaseSuspendedEvent carrying the case id, subjectAccountId, subjectType, and reason', () => {
    const verificationCase = buildDoctorCase();
    verificationCase.decide(VerificationStatus.Approved);
    verificationCase.releaseDomainEvents(); // clears the submission/decision events -- suspend() is a separate transaction in real usage

    verificationCase.suspend('License expired');

    const events = verificationCase.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof VerificationCaseSuspendedEvent);
    const event = events[0] as VerificationCaseSuspendedEvent;
    assert.equal(event.verificationCaseId, verificationCase.getId());
    assert.equal(event.subjectAccountId, SUBJECT_ACCOUNT_ID);
    assert.equal(event.subjectType, VerificationSubjectType.Doctor);
    assert.equal(event.reason, 'License expired');
  });

  it('a second suspend() attempt on an already-Suspended case throws VerificationCaseNotApprovedError and raises no further event (idempotency guard preserved)', () => {
    const verificationCase = buildDoctorCase();
    verificationCase.decide(VerificationStatus.Approved);
    verificationCase.suspend('License expired');
    verificationCase.releaseDomainEvents();

    assert.throws(() => verificationCase.suspend('License expired again'), VerificationCaseNotApprovedError);
    assert.equal(verificationCase.releaseDomainEvents().length, 0);
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
