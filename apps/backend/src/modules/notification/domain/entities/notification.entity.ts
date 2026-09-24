import { randomUUID } from 'node:crypto';

import { NotificationDomainError } from '../exceptions/notification-domain.error.js';
import { NotificationSeverity } from '../enums/notification-severity.enum.js';
import type { NotificationCategory } from '../enums/notification-category.enum.js';
import type { NotificationEntityType } from '../enums/notification-entity-type.enum.js';

export interface CreateNotificationProps {
  accountId: string;
  title: string;
  description: string;
  severity?: NotificationSeverity;
  /** Same-origin, locale-agnostic app path (e.g. "/admin/verification-queue/{id}") the frontend navigates to on click -- undefined when there's no single relevant page. */
  actionUrl?: string;
  /**
   * Doctor Settings Rebuild (Phase 3): the coarse category a per-account
   * NotificationPreference toggle can gate (PreferenceGatedNotificationRepository).
   * Left undefined for administrative/security/legal-notice notifications
   * (verification, account lifecycle, disputes, prescriptions) -- those are
   * permanently ungated, matching the industry norm that security/legal
   * notices aren't optional.
   */
  category?: NotificationCategory;
  /**
   * Doctor UX audit remediation (Phase 5 backend proposal): the specific
   * record this notification is about, when the triggering handler already
   * resolved one. Both fields are set together or not at all -- never a
   * type without an id or vice versa. Undefined for account-level
   * notifications with no single referenced record (e.g. new-device login,
   * password changed, role promotion).
   */
  entityType?: NotificationEntityType;
  entityId?: string;
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
  category?: NotificationCategory | null;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
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
    private readonly category: NotificationCategory | undefined,
    private readonly entityType: NotificationEntityType | undefined,
    private readonly entityId: string | undefined,
  ) {}

  static create(props: CreateNotificationProps): Notification {
    if (!props.title || props.title.trim().length === 0) {
      throw new NotificationDomainError('title must not be empty.');
    }
    if (!props.description || props.description.trim().length === 0) {
      throw new NotificationDomainError('description must not be empty.');
    }
    if ((props.entityType === undefined) !== (props.entityId === undefined)) {
      throw new NotificationDomainError('entityType and entityId must both be set or both be omitted.');
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
      props.category,
      props.entityType,
      props.entityId,
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
      props.category ?? undefined,
      props.entityType ?? undefined,
      props.entityId ?? undefined,
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

  getCategory(): NotificationCategory | undefined {
    return this.category;
  }

  getEntityType(): NotificationEntityType | undefined {
    return this.entityType;
  }

  getEntityId(): string | undefined {
    return this.entityId;
  }
}
