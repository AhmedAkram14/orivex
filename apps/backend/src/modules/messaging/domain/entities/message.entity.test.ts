import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MessagingDomainError } from '../exceptions/messaging-domain.error.js';

import { Message } from './message.entity.js';

describe('Message', () => {
  it('throws MessagingDomainError when both body and attachment are absent', () => {
    assert.throws(
      () => Message.send({ threadId: 'thread-1', senderAccountId: 'account-1', body: '   ' }),
      MessagingDomainError,
    );
  });

  it('allows an attachment-only message with no body', () => {
    const message = Message.send({ threadId: 'thread-1', senderAccountId: 'account-1', body: '', attachmentAssetId: 'asset-1' });

    assert.equal(message.getBody(), '');
    assert.equal(message.getAttachmentAssetId(), 'asset-1');
  });

  it('trims the body', () => {
    const message = Message.send({ threadId: 'thread-1', senderAccountId: 'account-1', body: '  hello  ' });

    assert.equal(message.getBody(), 'hello');
  });

  it('markRead is idempotent -- a second call never overwrites the first readAt', () => {
    const message = Message.send({ threadId: 'thread-1', senderAccountId: 'account-1', body: 'hello' });

    message.markRead();
    const firstReadAt = message.getReadAt();
    message.markRead();

    assert.equal(message.getReadAt(), firstReadAt);
  });
});
