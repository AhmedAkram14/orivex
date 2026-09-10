'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Heading } from '@/design-system/typography';
import { useAuthorArticle } from '@/features/knowledge/hooks/use-author-article';
import { useMyArticles } from '@/features/knowledge/hooks/use-my-articles';
import type { KnowledgeArticleStatus } from '@/features/knowledge/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge, type badgeVariants } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import type { VariantProps } from 'class-variance-authority';

const STATUS_BADGE_VARIANT: Record<KnowledgeArticleStatus, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  pending_review: 'warning',
  published: 'success',
  rejected: 'danger',
  archived: 'neutral',
};

/**
 * I13 -- Knowledge Center (docs/01.1-prd-update.md §6): the doctor's own
 * authoring surface -- a composer that submits `POST /knowledge/articles`
 * (pre-publication review gate and Syndicate-verification are enforced
 * entirely server-side, see AuthorArticleUseCase's own comment), plus the
 * doctor's "my articles" list showing each one's current status.
 */
export function ArticleComposer() {
  const t = useTranslations('knowledge.doctor');
  const tStatus = useTranslations('knowledge.statusLabels');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const author = useAuthorArticle();
  const { data: articles, isLoading, isError } = useMyArticles();

  async function handleSubmit() {
    try {
      const result = await author.mutateAsync({ title, body });
      setTitle('');
      setBody('');
      setSuccessStatus(result.status);
    } catch {
      // Inline error rendered below from author.error.
    }
  }

  const [successStatus, setSuccessStatus] = useState<KnowledgeArticleStatus | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Heading as="h2" level={4}>
            {t('composerTitle')}
          </Heading>

          <div className="flex flex-col gap-2">
            <label htmlFor="knowledge-article-title" className="text-sm font-medium text-text-secondary">
              {t('titleLabel')}
            </label>
            <Input
              id="knowledge-article-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setSuccessStatus(null);
              }}
              placeholder={t('titlePlaceholder')}
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="knowledge-article-body" className="text-sm font-medium text-text-secondary">
              {t('bodyLabel')}
            </label>
            <Textarea
              id="knowledge-article-body"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setSuccessStatus(null);
              }}
              placeholder={t('bodyPlaceholder')}
              rows={8}
              maxLength={20000}
            />
          </div>

          {author.isError && <Alert variant="danger">{t('submitError')}</Alert>}
          {successStatus && (
            <Alert variant="success">
              {successStatus === 'published' ? t('submitSuccessPublished') : t('submitSuccessPending')}
            </Alert>
          )}

          <div>
            <Button
              type="button"
              loading={author.isPending}
              disabled={title.trim().length === 0 || body.trim().length === 0}
              onClick={handleSubmit}
            >
              {t('submitAction')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Heading as="h2" level={4}>
          {t('myArticlesTitle')}
        </Heading>

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : !articles || articles.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {articles.map((article) => (
              <li key={article.id} className="flex flex-col gap-2 rounded-2xl border border-border-default p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">{article.title}</span>
                  <Badge variant={STATUS_BADGE_VARIANT[article.status]}>
                    {tStatus(article.status)}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-text-secondary">{article.body}</p>
                {article.moderationReason && (
                  <p className="text-xs text-text-tertiary">
                    {t('moderationReasonLabel')}: {article.moderationReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
