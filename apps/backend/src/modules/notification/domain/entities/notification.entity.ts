import { randomUUID } from 'node:crypto';

import { NotificationDomainError } from '../exceptions/notification-domain.error.js';
import { NotificationSeverity } from '../enums/notification-severity.enum.js';

export interface CreateNotificationProps {
  accountId: string;
  title: string;
  description: string;
  severity?: NotificationSeverity;
  /** Same-origin, locale-agnostic app path (e.g. "/admin/verification-queue/{id}") the frontend navigates to on click -- undefined when there's no single relevant page. */
  actionUrl?: string;
}

export interface ReconstituteNotificationProps {
  id: string;
  accountId: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: Date;
  actionUrl?: string | null;
}

// NotificationModule's own aggregate root (docs/05-information-architecture.md's
// Notifications Domain: "Owns delivery only... a pure consumer/router").
// Deliberately no producer-facing create() call site exists yet in this
// sprint -- create() exists for the domain layer's own correctness/tests,
// ready for the future event-subscriber wiring documented in docs/10-backend-
// architecture.md, without requiring that infrastructure first.
export class Notification {
  private constructor(
    private readonly id: string,
    private readonly accountId: string,
    private readonly title: string,
    private readonly description: string,
    private readonly severity: NotificationSeverity,
    private read: boolean,
    private readonly createdAt: Date,
    private readonly actionUrl: string | undefined,
  ) {}

  static create(props: CreateNotificationProps): Notification {
    if (!props.title || props.title.trim().length === 0) {
      throw new NotificationDomainError('title must not be empty.');
    }
    if (!props.description || props.description.trim().length === 0) {
      throw new NotificationDomainError('description must not be empty.');
    }

    return new Notification(
      randomUUID(),
      props.accountId,
      props.title.trim(),
      props.description.trim(),
      props.severity ?? NotificationSeverity.Info,
      false,
      new Date(),
      props.actionUrl,
    );
  }

  static reconstitute(props: ReconstituteNotificationProps): Notification {
    return new Notification(
      props.id,
      props.accountId,
      props.title,
      props.description,
      props.severity,
      props.read,
      props.createdAt,
      props.actionUrl ?? undefined,
    );
  }

  markRead(): void {
    this.read = true;
  }

  getId(): string {
    return this.id;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getTitle(): string {
    return this.title;
  }

  getDescription(): string {
    return this.description;
  }

  getSeverity(): NotificationSeverity {
    return this.severity;
  }

  isRead(): boolean {
    return this.read;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getActionUrl(): string | undefined {
    return this.actionUrl;
  }
}
