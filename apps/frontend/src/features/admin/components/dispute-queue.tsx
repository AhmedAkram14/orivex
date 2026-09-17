'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Heading } from '@/design-system/typography';
import { useAdminDisputes, type AdminDisputeStatusFilter } from '@/features/admin/hooks/use-admin-disputes';
import { useResolveDispute } from '@/features/admin/hooks/use-resolve-dispute';
import type { DisputeCategory } from '@/features/consultation/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';

interface PendingDecision {
  disputeId: string;
  status: 'resolved' | 'dismissed';
}

const CATEGORIES: DisputeCategory[] = ['no_show', 'payment_refund', 'conduct', 'technical_issue', 'other'];
const STATUS_FILTERS: Array<AdminDisputeStatusFilter | 'all'> = ['open', 'resolved', 'dismissed', 'withdrawn', 'all'];

/**
 * I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): the
 * SuperAdmin's queue of Open disputes (`GET /admin/disputes`, defaults to
 * status=open), with a Resolve/Dismiss decision on each -- mirrors
 * `ReviewModerationQueue`'s own confirm-dialog-with-notes pattern.
 *
 * Dispute System Hardening Phase 3: an admin auditing history previously had
 * no way to see past disputes at all -- a status filter (mirroring
 * `PatientsList`'s own `Select` pattern), including "all" (real, per-status
 * requests fanned out client-side -- `GET /admin/disputes` always defaults
 * an omitted status to Open server-side, so there is no single "all" request
 * to make), plus a category filter and a category badge on every row.
 */
export function DisputeQueue() {
  const t = useTranslations('admin.disputeResolution');
  const format = useFormatter();
  const [statusFilter, setStatusFilter] = useState<AdminDisputeStatusFilter | 'all'>('open');
  const [categoryFilter, setCategoryFilter] = useState<DisputeCategory | 'all'>('all');
  const { data: disputes, isLoading, isError } = useAdminDisputes(
    statusFilter,
    categoryFilter === 'all' ? undefined : categoryFilter,
  );
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

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AdminDisputeStatusFilter | 'all')}>
          <SelectTrigger className="w-40" aria-label={t('statusFilterLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((value) => (
              <SelectItem key={value} value={value}>
                {value === 'all' ? t('statusFilterAll') : t(`status.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as DisputeCategory | 'all')}>
          <SelectTrigger className="w-48" aria-label={t('categoryFilterLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('categoryFilterAll')}</SelectItem>
            {CATEGORIES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`category.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!disputes || disputes.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {disputes.map((dispute) => (
            <li key={dispute.id} className="flex flex-col gap-2 rounded-2xl border border-border-default p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-text-tertiary">{dispute.appointmentId.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  {dispute.category && <Badge variant="neutral">{t(`category.${dispute.category}`)}</Badge>}
                  <Badge variant="neutral">{t(`status.${dispute.status}`)}</Badge>
                  <span className="text-xs text-text-tertiary">
                    {format.dateTime(new Date(dispute.createdAt), { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>
              <p className="text-sm text-text-secondary">{dispute.reason}</p>
              {dispute.status === 'open' && (
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
              )}
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
