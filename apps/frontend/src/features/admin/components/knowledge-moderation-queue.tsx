'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Heading } from '@/design-system/typography';
import { useAdminKnowledgeArticles } from '@/features/admin/hooks/use-admin-knowledge-articles';
import { useModerateKnowledgeArticle } from '@/features/admin/hooks/use-moderate-knowledge-article';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';

interface PendingDecision {
  articleId: string;
  status: 'published' | 'rejected';
}

/**
 * I13 -- Knowledge Center (docs/01.1-prd-update.md §6): the SuperAdmin's
 * pre-publication review queue -- defaults to PendingReview, with an
 * Approve/Reject decision on each -- mirrors `ReviewModerationQueue`'s own
 * confirm-dialog-with-a-reason pattern exactly.
 */
export function KnowledgeModerationQueue() {
  const t = useTranslations('admin.knowledgeModeration');
  const { data: articles, isLoading, isError } = useAdminKnowledgeArticles('pending_review');
  const moderate = useModerateKnowledgeArticle();
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [reason, setReason] = useState('');

  function closeDialog() {
    setPending(null);
    setReason('');
    moderate.reset();
  }

  async function handleConfirm() {
    if (!pending) return;
    try {
      await moderate.mutateAsync({ id: pending.articleId, status: pending.status, reason });
      closeDialog();
    } catch {
      // Inline error rendered below from moderate.error.
    }
  }

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Heading as="h2" level={4}>
        {t('title')}
      </Heading>

      {!articles || articles.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {articles.map((article) => (
            <li key={article.id} className="flex flex-col gap-2 rounded-2xl border border-border-default p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-text-primary">{article.title}</span>
                <Badge variant="warning">{t('pendingBadge')}</Badge>
              </div>
              <p className="line-clamp-3 text-sm text-text-secondary">{article.body}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setPending({ articleId: article.id, status: 'published' })}
                >
                  {t('approveAction')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setPending({ articleId: article.id, status: 'rejected' })}
                >
                  {t('rejectAction')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.status === 'published' ? t('approveDialogTitle') : t('rejectDialogTitle')}</DialogTitle>
            <DialogDescription>
              {pending?.status === 'published' ? t('approveDialogDescription') : t('rejectDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('reasonPlaceholder')}
            rows={3}
          />

          {moderate.isError && <Alert variant="danger">{t('moderateError')}</Alert>}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t('cancel')}
            </Button>
            <Button
              variant={pending?.status === 'rejected' ? 'danger' : 'primary'}
              loading={moderate.isPending}
              disabled={reason.trim().length === 0}
              onClick={handleConfirm}
            >
              {pending?.status === 'published' ? t('confirmApprove') : t('confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
