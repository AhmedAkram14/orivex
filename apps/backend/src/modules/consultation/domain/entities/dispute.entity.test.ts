import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';
import { DisputeStatus } from '../enums/dispute-status.enum.js';

import { Dispute } from './dispute.entity.js';

const PROPS = {
  appointmentId: '11111111-1111-4111-8111-111111111111',
  raisedByAccountId: '22222222-2222-4222-8222-222222222222',
  reason: 'The doctor never joined the call.',
};

describe('Dispute', () => {
  it('raises as Open with a trimmed reason', () => {
    const dispute = Dispute.raise({ ...PROPS, reason: '  The doctor never joined.  ' });
    assert.equal(dispute.getStatus(), DisputeStatus.Open);
    assert.equal(dispute.getReason(), 'The doctor never joined.');
  });

  it('throws on an empty reason', () => {
    assert.throws(() => Dispute.raise({ ...PROPS, reason: '   ' }), ConsultationDomainError);
  });

  it('resolve() closes an Open dispute, recording who and when', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.resolve(DisputeStatus.Resolved, 'Refunded the patient in full.', 'admin-account-1');
    assert.equal(dispute.getStatus(), DisputeStatus.Resolved);
    assert.equal(dispute.getResolutionNotes(), 'Refunded the patient in full.');
    assert.equal(dispute.getResolvedByAccountId(), 'admin-account-1');
    assert.ok(dispute.getResolvedAt());
  });

  it('resolve() can dismiss instead of resolving', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.resolve(DisputeStatus.Dismissed, 'No evidence of an issue.', 'admin-account-1');
    assert.equal(dispute.getStatus(), DisputeStatus.Dismissed);
  });

  it('resolve() throws when the dispute is not Open', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.resolve(DisputeStatus.Resolved, 'Refunded.', 'admin-account-1');
    assert.throws(
      () => dispute.resolve(DisputeStatus.Dismissed, 'Changed my mind.', 'admin-account-1'),
      ConsultationDomainError,
    );
  });

  it('resolve() throws on empty resolution notes', () => {
    const dispute = Dispute.raise(PROPS);
    assert.throws(() => dispute.resolve(DisputeStatus.Resolved, '  ', 'admin-account-1'), ConsultationDomainError);
  });
});
