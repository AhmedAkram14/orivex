'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Heading } from '@/design-system/typography';
import { ArticleComposer, type ComposerMode } from '@/features/knowledge/components/article-composer';
import { useMyArticles } from '@/features/knowledge/hooks/use-my-articles';
import { useUnpublishArticle } from '@/features/knowledge/hooks/use-unpublish-article';
import type { KnowledgeArticle, KnowledgeArticleStatus } from '@/features/knowledge/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge, type badgeVariants } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import type { VariantProps } from 'class-variance-authority';

type StatusFilter = 'all' | KnowledgeArticleStatus;
type SortOrder = 'newest' | 'oldest' | 'most_viewed';

const STATUS_BADGE_VARIANT: Record<KnowledgeArticleStatus, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  draft: 'neutral',
  pending_review: 'warning',
  published: 'success',
  rejected: 'danger',
  archived: 'neutral',
};

/**
 * Knowledge Center Hardening Phase 3, item 16/17: the doctor's own
 * "My articles" list -- extracted out of `article-composer.tsx` (which used
 * to render this inline, read-only) and given real search/filter/sort
 * controls mirroring `patients-list.tsx`'s exact pattern, plus the
 * Edit/Unpublish row actions the plan calls for. Also owns the composer's
 * collapse/expand state (item 15) -- the composer itself has no opinion on
 * whether it's shown.
 */
export function MyArticlesList() {
  const t = useTranslations('knowledge.doctor');
  const tStatus = useTranslations('knowledge.statusLabels');
  const { data: articles, isLoading, isError } = useMyArticles();
  const unpublish = useUnpublishArticle();

  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [unpublishTarget, setUnpublishTarget] = useState<KnowledgeArticle | null>(null);
  const [unpublishReason, setUnpublishReason] = useState('');

  const filtered = useMemo(() => {
    if (!articles) return [];
    const query = search.trim().toLowerCase();
    return articles
      .filter((article) => {
        if (query && !article.title.toLowerCase().includes(query)) return false;
        if (statusFilter !== 'all' && article.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'most_viewed') return b.viewCount - a.viewCount;
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort === 'newest' ? -diff : diff;
      });
  }, [articles, search, statusFilter, sort]);

  const hasAnyArticles = Boolean(articles && articles.length > 0);
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== 'all';

  function closeComposer() {
    setComposerMode(null);
  }

  function closeUnpublishDialog() {
    setUnpublishTarget(null);
    setUnpublishReason('');
    unpublish.reset();
  }

  async function handleConfirmUnpublish() {
    if (!unpublishTarget) return;
    try {
      await unpublish.mutateAsync({ id: unpublishTarget.id, reason: unpublishReason });
      closeUnpublishDialog();
    } catch {
      // Inline error rendered below from unpublish.error.
    }
  }

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      {composerMode ? (
        <div className="flex flex-col gap-2">
          <ArticleComposer mode={composerMode} onDone={closeComposer} />
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={closeComposer}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        // When the doctor has zero articles, the trigger lives embedded in
        // the EmptyState below instead (item 17's two-tier pattern) --
        // rendering both here would be a duplicate "Write an article"
        // button with the same accessible name.
        hasAnyArticles && (
          <div>
            <Button type="button" onClick={() => setComposerMode('create')}>
              {t('writeArticleAction')}
            </Button>
          </div>
        )
      )}

      <div className="flex flex-col gap-4">
        <Heading as="h2" level={4}>
          {t('myArticlesTitle')}
        </Heading>

        {isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : !hasAnyArticles ? (
          <EmptyState
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            action={
              !composerMode && (
                <Button type="button" size="sm" onClick={() => setComposerMode('create')}>
                  {t('writeArticleAction')}
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="min-w-64 flex-1"
              />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-48" aria-label={t('filterStatusLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filterStatusAll')}</SelectItem>
                  <SelectItem value="draft">{tStatus('draft')}</SelectItem>
                  <SelectItem value="pending_review">{tStatus('pending_review')}</SelectItem>
                  <SelectItem value="published">{tStatus('published')}</SelectItem>
                  <SelectItem value="rejected">{tStatus('rejected')}</SelectItem>
                  <SelectItem value="archived">{tStatus('archived')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(value) => setSort(value as SortOrder)}>
                <SelectTrigger className="w-48" aria-label={t('sortLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('sortOptions.newest')}</SelectItem>
                  <SelectItem value="oldest">{t('sortOptions.oldest')}</SelectItem>
                  <SelectItem value="most_viewed">{t('sortOptions.mostViewed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <Card>
                <div className="flex flex-col items-center gap-4 p-6">
                  <EmptyState title={t('noResultsTitle')} description={t('noResultsDescription')} />
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('all');
                      }}
                    >
                      {t('clearFilters')}
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <ul className="flex flex-col gap-3">
                {filtered.map((article) => (
                  <li key={article.id} className="flex flex-col gap-2 rounded-2xl border border-border-default p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span dir="auto" className="font-medium text-text-primary">
                        {article.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral">{t(`languageOptions.${article.language}`)}</Badge>
                        <Badge variant={STATUS_BADGE_VARIANT[article.status]}>{tStatus(article.status)}</Badge>
                      </div>
                    </div>
                    <p dir="auto" className="line-clamp-2 text-sm text-text-secondary">
                      {article.body}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-text-tertiary">{t('viewCountLabel', { count: article.viewCount })}</span>
                      {article.moderationReason && (
                        <p className="text-xs text-text-tertiary">
                          {t('moderationReasonLabel')}: {article.moderationReason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* The domain entity's own `edit()` throws for
                          Rejected/Archived (see knowledge-article.entity.ts's
                          class comment: "no path back from Rejected/Archived
                          -- whoever changes their mind creates a new
                          article") -- Edit is only ever offered for the
                          three statuses that are actually still editable. */}
                      {(article.status === 'draft' || article.status === 'pending_review' || article.status === 'published') && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setComposerMode({ editing: article })}
                        >
                          {t('editAction')}
                        </Button>
                      )}
                      {article.status === 'published' && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setUnpublishTarget(article)}>
                          {t('unpublishAction')}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <Dialog open={unpublishTarget !== null} onOpenChange={(open) => !open && closeUnpublishDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('unpublishDialogTitle')}</DialogTitle>
            <DialogDescription>{t('unpublishDialogDescription')}</DialogDescription>
          </DialogHeader>

          <Textarea
            value={unpublishReason}
            onChange={(event) => setUnpublishReason(event.target.value)}
            placeholder={t('unpublishReasonPlaceholder')}
            rows={3}
          />

          {unpublish.isError && <Alert variant="danger">{t('unpublishError')}</Alert>}

          <DialogFooter>
            <Button variant="outline" onClick={closeUnpublishDialog}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              loading={unpublish.isPending}
              disabled={unpublishReason.trim().length === 0}
              onClick={handleConfirmUnpublish}
            >
              {t('confirmUnpublishAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
