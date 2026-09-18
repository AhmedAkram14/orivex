// I13 -- Knowledge Center (docs/01.1-prd-update.md §6). Matches
// KnowledgeArticle's real Prisma enum exactly.
export enum KnowledgeArticleStatus {
  Draft = 'draft',
  PendingReview = 'pending_review',
  Published = 'published',
  Rejected = 'rejected',
  Archived = 'archived',
}
