import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';
import { DisputeStatus } from '../enums/dispute-status.enum.js';
import { DisputeCategory } from '../enums/dispute-category.enum.js';
import { DisputeRaisedEvent } from '../events/dispute-raised.event.js';
import { DisputeResolvedEvent } from '../events/dispute-resolved.event.js';
import { DisputeDismissedEvent } from '../events/dispute-dismissed.event.js';
import { DisputeWithdrawnEvent } from '../events/dispute-withdrawn.event.js';

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

  it('raise() records a DisputeRaisedEvent', () => {
    const dispute = Dispute.raise(PROPS);
    const events = dispute.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof DisputeRaisedEvent);
    assert.equal((events[0] as DisputeRaisedEvent).disputeId, dispute.getId());
  });

  it('releaseDomainEvents() drains the buffer', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.releaseDomainEvents();
    assert.deepEqual(dispute.releaseDomainEvents(), []);
  });

  it('exposes category and attachmentAssetId via getters', () => {
    const dispute = Dispute.raise({
      ...PROPS,
      category: DisputeCategory.NoShow,
      attachmentAssetId: '33333333-3333-4333-8333-333333333333',
    });
    assert.equal(dispute.getCategory(), DisputeCategory.NoShow);
    assert.equal(dispute.getAttachmentAssetId(), '33333333-3333-4333-8333-333333333333');
  });

  it('category and attachmentAssetId are undefined when not provided', () => {
    const dispute = Dispute.raise(PROPS);
    assert.equal(dispute.getCategory(), undefined);
    assert.equal(dispute.getAttachmentAssetId(), undefined);
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

  it('resolve() records a DisputeResolvedEvent when resolved', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.releaseDomainEvents();
    dispute.resolve(DisputeStatus.Resolved, 'Refunded the patient in full.', 'admin-account-1');
    const events = dispute.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof DisputeResolvedEvent);
  });

  it('resolve() records a DisputeDismissedEvent when dismissed', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.releaseDomainEvents();
    dispute.resolve(DisputeStatus.Dismissed, 'No evidence of an issue.', 'admin-account-1');
    const events = dispute.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof DisputeDismissedEvent);
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

  it('withdraw() transitions an Open dispute to Withdrawn and records DisputeWithdrawnEvent', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.releaseDomainEvents();
    dispute.withdraw();
    assert.equal(dispute.getStatus(), DisputeStatus.Withdrawn);
    const events = dispute.releaseDomainEvents();
    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof DisputeWithdrawnEvent);
    assert.equal((events[0] as DisputeWithdrawnEvent).disputeId, dispute.getId());
  });

  it('withdraw() throws when the dispute is not Open', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.resolve(DisputeStatus.Resolved, 'Refunded.', 'admin-account-1');
    assert.throws(() => dispute.withdraw(), ConsultationDomainError);
  });

  it('withdraw() throws once already withdrawn', () => {
    const dispute = Dispute.raise(PROPS);
    dispute.withdraw();
    assert.throws(() => dispute.withdraw(), ConsultationDomainError);
  });
});
