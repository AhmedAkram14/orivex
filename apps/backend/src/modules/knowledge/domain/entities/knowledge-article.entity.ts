import { randomUUID } from 'node:crypto';

import { KnowledgeDomainError } from '../exceptions/knowledge-domain.error.js';
import { KnowledgeArticleStatus } from '../enums/knowledge-article-status.enum.js';

export interface AuthorArticleProps {
  authoringDoctorId: string;
  title: string;
  body: string;
  /** Whether this doctor has already cleared the pre-publication review threshold (computed by the application layer -- the entity has no repository access to count past articles itself). */
  requiresPreReview: boolean;
}

export interface ReconstituteKnowledgeArticleProps {
  id: string;
  authoringDoctorId: string;
  title: string;
  body: string;
  status: KnowledgeArticleStatus;
  moderationReason?: string;
  moderatedByAccountId?: string;
  moderatedAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// I13 -- Knowledge Center (docs/01.1-prd-update.md §6). PendingReview vs
// Published-immediately is decided once, at authoring time, by whether
// this doctor has cleared the pre-publication review threshold (the
// application layer's job -- counting past articles is a repository
// query, not something this entity can do). From there:
// PendingReview -> Published | Rejected (an admin's first decision);
// Published -> Archived (a later, post-publication spot-review takedown).
// There is no path back from Rejected/Archived to Published -- an admin
// who changes their mind creates a new article, never resurrects an old
// moderation decision (same "immutable trail" posture as AuditLog/Dispute).
export class KnowledgeArticle {
  private constructor(
    private readonly id: string,
    private readonly authoringDoctorId: string,
    private readonly title: string,
    private readonly body: string,
    private status: KnowledgeArticleStatus,
    private moderationReason: string | undefined,
    private moderatedByAccountId: string | undefined,
    private moderatedAt: Date | undefined,
    private publishedAt: Date | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static author(props: AuthorArticleProps): KnowledgeArticle {
    if (!props.title || props.title.trim().length === 0) {
      throw new KnowledgeDomainError('An article requires a title.');
    }
    if (!props.body || props.body.trim().length === 0) {
      throw new KnowledgeDomainError('An article requires body content.');
    }

    const now = new Date();
    const status = props.requiresPreReview ? KnowledgeArticleStatus.PendingReview : KnowledgeArticleStatus.Published;
    return new KnowledgeArticle(
      randomUUID(),
      props.authoringDoctorId,
      props.title.trim(),
      props.body.trim(),
      status,
      undefined,
      undefined,
      undefined,
      status === KnowledgeArticleStatus.Published ? now : undefined,
      now,
      now,
    );
  }

  static reconstitute(props: ReconstituteKnowledgeArticleProps): KnowledgeArticle {
    return new KnowledgeArticle(
      props.id,
      props.authoringDoctorId,
      props.title,
      props.body,
      props.status,
      props.moderationReason,
      props.moderatedByAccountId,
      props.moderatedAt,
      props.publishedAt,
      props.createdAt,
      props.updatedAt,
    );
  }

  // The admin's decision -- approving a PendingReview article, rejecting
  // it, or archiving a currently-Published one. Reason is always required:
  // every moderation action on a verified doctor's published content is
  // logged with a real explanation, matching the release checklist's
  // "admin actions must be audit-logged with actor, timestamp, and reason"
  // rule.
  moderate(
    status: KnowledgeArticleStatus.Published | KnowledgeArticleStatus.Rejected | KnowledgeArticleStatus.Archived,
    reason: string,
    moderatorAccountId: string,
  ): void {
    if (!reason || reason.trim().length === 0) {
      throw new KnowledgeDomainError('A reason is required to moderate an article.');
    }
    if (status === KnowledgeArticleStatus.Published && this.status !== KnowledgeArticleStatus.PendingReview) {
      throw new KnowledgeDomainError('Only a pending-review article can be approved.');
    }
    if (status === KnowledgeArticleStatus.Rejected && this.status !== KnowledgeArticleStatus.PendingReview) {
      throw new KnowledgeDomainError('Only a pending-review article can be rejected.');
    }
    if (status === KnowledgeArticleStatus.Archived && this.status !== KnowledgeArticleStatus.Published) {
      throw new KnowledgeDomainError('Only a published article can be archived.');
    }

    this.status = status;
    this.moderationReason = reason.trim();
    this.moderatedByAccountId = moderatorAccountId;
    this.moderatedAt = new Date();
    this.updatedAt = this.moderatedAt;
    if (status === KnowledgeArticleStatus.Published) {
      this.publishedAt = this.moderatedAt;
    }
  }

  getId(): string {
    return this.id;
  }

  getAuthoringDoctorId(): string {
    return this.authoringDoctorId;
  }

  getTitle(): string {
    return this.title;
  }

  getBody(): string {
    return this.body;
  }

  getStatus(): KnowledgeArticleStatus {
    return this.status;
  }

  getModerationReason(): string | undefined {
    return this.moderationReason;
  }

  getModeratedByAccountId(): string | undefined {
    return this.moderatedByAccountId;
  }

  getModeratedAt(): Date | undefined {
    return this.moderatedAt;
  }

  getPublishedAt(): Date | undefined {
    return this.publishedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
