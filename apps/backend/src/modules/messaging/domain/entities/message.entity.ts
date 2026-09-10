import { randomUUID } from 'node:crypto';

import { MessagingDomainError } from '../exceptions/messaging-domain.error.js';

export interface SendMessageProps {
  threadId: string;
  senderAccountId: string;
  body: string;
  attachmentAssetId?: string;
}

export interface ReconstituteMessageProps {
  id: string;
  threadId: string;
  senderAccountId: string;
  body: string;
  attachmentAssetId?: string;
  readAt?: Date;
  createdAt: Date;
}

// I7 -- Messaging. Immutable once sent (no edit/delete -- matches this
// codebase's "never rewrite" convention for anything that could later
// matter as a record of what was actually said) except for the one real
// state change a message ever undergoes: being marked read by the other
// party.
export class Message {
  private constructor(
    private readonly id: string,
    private readonly threadId: string,
    private readonly senderAccountId: string,
    private readonly body: string,
    private readonly attachmentAssetId: string | undefined,
    private readAt: Date | undefined,
    private readonly createdAt: Date,
  ) {}

  static send(props: SendMessageProps): Message {
    const body = props.body?.trim() ?? '';
    if (!body && !props.attachmentAssetId) {
      throw new MessagingDomainError('A message must have a body or an attachment.');
    }
    return new Message(randomUUID(), props.threadId, props.senderAccountId, body, props.attachmentAssetId, undefined, new Date());
  }

  static reconstitute(props: ReconstituteMessageProps): Message {
    return new Message(
      props.id,
      props.threadId,
      props.senderAccountId,
      props.body,
      props.attachmentAssetId,
      props.readAt,
      props.createdAt,
    );
  }

  markRead(): void {
    if (!this.readAt) {
      this.readAt = new Date();
    }
  }

  getId(): string {
    return this.id;
  }

  getThreadId(): string {
    return this.threadId;
  }

  getSenderAccountId(): string {
    return this.senderAccountId;
  }

  getBody(): string {
    return this.body;
  }

  getAttachmentAssetId(): string | undefined {
    return this.attachmentAssetId;
  }

  getReadAt(): Date | undefined {
    return this.readAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
