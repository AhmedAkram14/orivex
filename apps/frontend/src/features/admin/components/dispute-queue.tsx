'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Heading } from '@/design-system/typography';
import { useAdminDisputes } from '@/features/admin/hooks/use-admin-disputes';
import { useResolveDispute } from '@/features/admin/hooks/use-resolve-dispute';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';

interface PendingDecision {
  disputeId: string;
  status: 'resolved' | 'dismissed';
}

/**
 * I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): the
 * SuperAdmin's queue of Open disputes (`GET /admin/disputes`, defaults to
 * status=open), with a Resolve/Dismiss decision on each -- mirrors
 * `ReviewModerationQueue`'s own confirm-dialog-with-notes pattern.
 */
export function DisputeQueue() {
  const t = useTranslations('admin.disputeResolution');
  const format = useFormatter();
  const { data: disputes, isLoading, isError } = useAdminDisputes('open');
  const resolve = useResolveDispute();
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [notes, setNotes] = useState('');

  function closeDialog() {
    setPending(null);
    setNotes('');
    resolve.reset();
  }

  async function handleConfirm() {
    if (!pending) return;
    try {
      await resolve.mutateAsync({ id: pending.disputeId, status: pending.status, resolutionNotes: notes });
      closeDialog();
    } catch {
      // Inline error rendered below from resolve.error.
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

      {!disputes || disputes.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {disputes.map((dispute) => (
            <li key={dispute.id} className="flex flex-col gap-2 rounded-2xl border border-border-default p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-text-tertiary">{dispute.appointmentId.slice(0, 8)}</span>
                <span className="text-xs text-text-tertiary">
                  {format.dateTime(new Date(dispute.createdAt), { dateStyle: 'medium' })}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{dispute.reason}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPending({ disputeId: dispute.id, status: 'dismissed' })}
                >
                  {t('dismissAction')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setPending({ disputeId: dispute.id, status: 'resolved' })}
                >
                  {t('resolveAction')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.status === 'resolved' ? t('resolveDialogTitle') : t('dismissDialogTitle')}</DialogTitle>
            <DialogDescription>
              {pending?.status === 'resolved' ? t('resolveDialogDescription') : t('dismissDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t('notesPlaceholder')} rows={3} />

          {resolve.isError && <Alert variant="danger">{t('resolveError')}</Alert>}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t('cancel')}
            </Button>
            <Button loading={resolve.isPending} disabled={notes.trim().length === 0} onClick={handleConfirm}>
              {pending?.status === 'resolved' ? t('confirmResolve') : t('confirmDismiss')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
