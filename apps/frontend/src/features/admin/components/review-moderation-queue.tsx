'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Heading } from '@/design-system/typography';
import { useAdminReviews } from '@/features/admin/hooks/use-admin-reviews';
import { useModerateReview } from '@/features/admin/hooks/use-moderate-review';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/cn';

interface PendingDecision {
  feedbackId: string;
  status: 'visible' | 'hidden';
}

/**
 * I11 -- Admin content moderation (ORIVEX Remaining Work Audit): the
 * SuperAdmin's queue of Flagged reviews (`GET /admin/reviews`, defaults to
 * status=flagged), with a Restore/Hide decision on each -- mirrors
 * `VerificationReviewActions`'s own confirm-dialog-with-a-reason pattern.
 */
export function ReviewModerationQueue() {
  const t = useTranslations('admin.reviewModeration');
  const { data: reviews, isLoading, isError } = useAdminReviews('flagged');
  const moderate = useModerateReview();
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
      await moderate.mutateAsync({ id: pending.feedbackId, status: pending.status, reason });
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

      {!reviews || reviews.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-2 rounded-2xl border border-border-default p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5" aria-label={`${review.rating}/5`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Icon
                      key={index}
                      icon={Star}
                      size="sm"
                      className={cn(index < review.rating ? 'fill-warning text-warning' : 'text-border-strong')}
                    />
                  ))}
                </div>
                <Badge variant="warning">{t('flaggedBadge')}</Badge>
              </div>
              {review.comment && <p className="text-sm text-text-secondary">{review.comment}</p>}
              <p className="text-xs text-text-tertiary">
                {t('flaggedReasonLabel')}: {review.moderationReason}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPending({ feedbackId: review.id, status: 'visible' })}
                >
                  {t('restoreAction')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setPending({ feedbackId: review.id, status: 'hidden' })}
                >
                  {t('hideAction')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.status === 'visible' ? t('restoreDialogTitle') : t('hideDialogTitle')}</DialogTitle>
            <DialogDescription>
              {pending?.status === 'visible' ? t('restoreDialogDescription') : t('hideDialogDescription')}
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
              variant={pending?.status === 'hidden' ? 'danger' : 'primary'}
              loading={moderate.isPending}
              disabled={reason.trim().length === 0}
              onClick={handleConfirm}
            >
              {pending?.status === 'visible' ? t('confirmRestore') : t('confirmHide')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
