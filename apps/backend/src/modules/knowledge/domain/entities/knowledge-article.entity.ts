import { randomUUID } from 'node:crypto';

import { KnowledgeDomainError } from '../exceptions/knowledge-domain.error.js';
import { KnowledgeArticleStatus } from '../enums/knowledge-article-status.enum.js';
import { KnowledgeArticleLanguage } from '../enums/knowledge-article-language.enum.js';

export interface AuthorArticleProps {
  authoringDoctorId: string;
  title: string;
  body: string;
  language: KnowledgeArticleLanguage;
  specialtyId: string;
  sourcesText?: string;
  /** Whether this doctor has already cleared the pre-publication review threshold (computed by the application layer -- the entity has no repository access to count past articles itself). */
  requiresPreReview: boolean;
}

export interface ReconstituteKnowledgeArticleProps {
  id: string;
  authoringDoctorId: string;
  title: string;
  body: string;
  status: KnowledgeArticleStatus;
  language: KnowledgeArticleLanguage;
  specialtyId: string;
  sourcesText?: string;
  viewCount: number;
  moderationReason?: string;
  moderatedByAccountId?: string;
  moderatedAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// I13 -- Knowledge Center (docs/01.1-prd-update.md §6).
//
// Knowledge Center Hardening Phase 0 widened this from a strictly one-way
// machine to the following full set of legal edges:
//
//   Draft -> PendingReview | Published   via submitForReview(requiresPreReview),
//                                         enforcing the minimum-length floor
//                                         (a Draft itself may be arbitrarily
//                                         short/empty-ish -- the floor is a
//                                         submit-time gate, not a construction
//                                         one).
//   PendingReview -> Published | Rejected  an admin's first decision (moderate()).
//   Published -> Archived                  a later, post-publication spot-review
//                                           takedown (moderate()), OR the
//                                           author's own unpublish().
//   Published -> PendingReview             via edit() ONLY, when the authoring
//                                           doctor edits an already-live
//                                           article's content.
//
// PendingReview vs. Published-immediately (both at initial authoring, via
// author(), and again at submitForReview()) is decided by whether this
// doctor has cleared the pre-publication review threshold -- the application
// layer's job, since counting past articles is a repository query, not
// something this entity can do.
//
// There is still no path back from Rejected/Archived to Published/
// PendingReview -- whoever changes their mind creates a new article, never
// resurrects an old moderation decision (same "immutable trail" posture as
// AuditLog/Dispute). The ONE deliberate, narrow exception to "no path back"
// is Published -> PendingReview via edit(): this is scoped strictly to an
// author-initiated content edit, never to an admin moderation decision --
// an admin's only lever on a Published article is still Archived (via
// moderate() or the author's own unpublish()); an admin never sends a
// Published article back to PendingReview themselves. When edit() fires this
// transition it also clears moderationReason/moderatedByAccountId/
// moderatedAt (they described the *prior* version's approval, now stale for
// the edited content awaiting re-review) but deliberately preserves
// publishedAt -- it records the historical "this article was live once" fact,
// which later moderation-queue work (Phase 2) uses to tell a resubmitted edit
// apart from a brand-new submission.
export class KnowledgeArticle {
  private constructor(
    private readonly id: string,
    private readonly authoringDoctorId: string,
    private title: string,
    private body: string,
    private status: KnowledgeArticleStatus,
    private language: KnowledgeArticleLanguage,
    private specialtyId: string,
    private sourcesText: string | undefined,
    private viewCount: number,
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
      props.language,
      props.specialtyId,
      props.sourcesText?.trim() || undefined,
      0,
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
      props.language,
      props.specialtyId,
      props.sourcesText,
      props.viewCount,
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

  // Knowledge Center Hardening Phase 0, decision 1: the authoring doctor
  // editing their own article's content. Legal from Draft/PendingReview
  // (content not yet live -- update in place, no status change) and from
  // Published (content already live -- editing it re-enters the review
  // queue: see this class's own doc comment for why this is the one
  // deliberate exception to "no path back"). Illegal from Rejected/Archived,
  // matching moderate()'s own "an admin who changes their mind creates a new
  // article" posture, extended here to authors: a doctor whose article was
  // rejected or archived authors a new one, never resurrects the old one.
  edit(title: string, body: string, language: KnowledgeArticleLanguage, specialtyId: string, sourcesText?: string): void {
    if (this.status === KnowledgeArticleStatus.Rejected || this.status === KnowledgeArticleStatus.Archived) {
      throw new KnowledgeDomainError('A rejected or archived article can no longer be edited.');
    }

    this.title = title.trim();
    this.body = body.trim();
    this.language = language;
    this.specialtyId = specialtyId;
    this.sourcesText = sourcesText?.trim() || undefined;
    this.updatedAt = new Date();

    if (this.status === KnowledgeArticleStatus.Published) {
      this.status = KnowledgeArticleStatus.PendingReview;
      // Stale verdict about the *previous* version -- the edited content has
      // not been reviewed yet. publishedAt is deliberately left untouched;
      // see this class's doc comment.
      this.moderationReason = undefined;
      this.moderatedByAccountId = undefined;
      this.moderatedAt = undefined;
    }
  }

  // Knowledge Center Hardening Phase 0, decision 6: a Draft's one-way exit
  // into the review pipeline. The minimum-length floor is enforced here,
  // not in author()/the constructor, so a Draft itself can be saved
  // arbitrarily short (or effectively empty) while the doctor is still
  // composing it -- only the act of *submitting* it demands real content.
  submitForReview(requiresPreReview: boolean): void {
    if (this.status !== KnowledgeArticleStatus.Draft) {
      throw new KnowledgeDomainError('Only a draft article can be submitted for review.');
    }
    if (this.title.trim().length < 10) {
      throw new KnowledgeDomainError('An article requires a title of at least 10 characters to submit for review.');
    }
    if (this.body.trim().length < 200) {
      throw new KnowledgeDomainError('An article requires a body of at least 200 characters to submit for review.');
    }

    const now = new Date();
    this.status = requiresPreReview ? KnowledgeArticleStatus.PendingReview : KnowledgeArticleStatus.Published;
    this.updatedAt = now;
    if (this.status === KnowledgeArticleStatus.Published) {
      this.publishedAt = now;
    }
  }

  // Knowledge Center Hardening Phase 0, decision 1: the author's own
  // takedown of their live article -- distinct from moderate()'s
  // admin-initiated Archived transition (different actor/authorization
  // path, same terminal state and reason-required convention). Reuses the
  // moderationReason/moderatedByAccountId/moderatedAt columns moderate()
  // uses -- a deliberate reuse, not a bug: "why/who changed this status
  // last" is one honest trail regardless of whether the actor was an admin
  // or the author themselves.
  unpublish(reason: string, actingAccountId: string): void {
    if (this.status !== KnowledgeArticleStatus.Published) {
      throw new KnowledgeDomainError('Only a published article can be unpublished.');
    }
    if (!reason || reason.trim().length === 0) {
      throw new KnowledgeDomainError('A reason is required to unpublish an article.');
    }

    this.status = KnowledgeArticleStatus.Archived;
    this.moderationReason = reason.trim();
    this.moderatedByAccountId = actingAccountId;
    this.moderatedAt = new Date();
    this.updatedAt = this.moderatedAt;
  }

  // Knowledge Center Hardening Phase 0, decision 4/7: a plain read-count
  // increment. Deliberately does not touch updatedAt -- a view is not a
  // content/audit-worthy mutation of the article itself.
  recordView(): void {
    this.viewCount += 1;
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

  getLanguage(): KnowledgeArticleLanguage {
    return this.language;
  }

  getSpecialtyId(): string {
    return this.specialtyId;
  }

  getSourcesText(): string | undefined {
    return this.sourcesText;
  }

  getViewCount(): number {
    return this.viewCount;
  }
}
