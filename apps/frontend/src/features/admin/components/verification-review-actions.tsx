'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useReviewVerificationCase } from '@/features/admin/hooks/use-review-verification-case';
import { useSuspendVerificationCase } from '@/features/admin/hooks/use-suspend-verification-case';
import type { VerificationCase, VerificationDecisionStatus } from '@/features/admin/api/types';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Textarea } from '@/shared/ui/textarea';

export interface VerificationReviewActionsProps {
  verificationCase: VerificationCase;
}

type ReasonDialogKind = 'reject' | 'more_info_needed' | 'suspend';

const DECIDABLE_STATUSES = new Set(['submitted', 'under_review', 'more_info_needed', 're_verification_due']);

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
 * real review actions, persisted through the real backend
 * (`PATCH /admin/verification-queue/:id` / `.../suspend`) -- the domain
 * itself (`VerificationCase.decide()`/`.suspend()`) is what actually
 * prevents an invalid transition (e.g. re-deciding an already-Approved
 * case); this component only ever shows the actions valid for the case's
 * *current* status, it never duplicates that lifecycle logic itself.
 * Reject/Request More Information/Suspend all require a non-empty reason;
 * Approve has no note field -- the domain has nowhere to put one beyond the
 * same `reason` field reject/more-info already use, and inventing a second
 * one would be scope the task explicitly warned against.
 */
export function VerificationReviewActions({ verificationCase }: VerificationReviewActionsProps) {
  const t = useTranslations('admin.verificationCase.actions');
  const review = useReviewVerificationCase();
  const suspend = useSuspendVerificationCase();
  const [dialogKind, setDialogKind] = useState<ReasonDialogKind | null>(null);
  const [reason, setReason] = useState('');

  const mutation = dialogKind === 'suspend' ? suspend : review;
  const error = mutation.error;
  const canDecide = DECIDABLE_STATUSES.has(verificationCase.status);
  const canSuspend = verificationCase.status === 'approved';

  function openDialog(kind: ReasonDialogKind) {
    setReason('');
    setDialogKind(kind);
  }

  function closeDialog() {
    setDialogKind(null);
    setReason('');
  }

  async function handleApprove() {
    await review.mutateAsync({ id: verificationCase.id, request: { status: 'approved' } });
  }

  async function handleConfirmReasonDialog() {
    if (!dialogKind || reason.trim().length === 0) return;

    if (dialogKind === 'suspend') {
      await suspend.mutateAsync({ id: verificationCase.id, request: { reason: reason.trim() } });
    } else {
      const status: VerificationDecisionStatus = dialogKind === 'reject' ? 'rejected' : 'more_info_needed';
      await review.mutateAsync({ id: verificationCase.id, request: { status, reason: reason.trim() } });
    }
    closeDialog();
  }

  const dialogCopy: Record<ReasonDialogKind, { title: string; description: string; confirm: string }> = {
    reject: { title: t('rejectDialogTitle'), description: t('rejectDialogDescription'), confirm: t('reject') },
    more_info_needed: {
      title: t('moreInfoDialogTitle'),
      description: t('moreInfoDialogDescription'),
      confirm: t('requestMoreInfo'),
    },
    suspend: { title: t('suspendDialogTitle'), description: t('suspendDialogDescription'), confirm: t('suspend') },
  };

  return (
    <div className="flex flex-col gap-3">
      {error instanceof ApiError && <Alert variant="danger">{error.message}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        {canDecide && (
          <>
            <Button loading={review.isPending && !dialogKind} onClick={handleApprove}>
              {t('approve')}
            </Button>
            <Button variant="outline" onClick={() => openDialog('more_info_needed')}>
              {t('requestMoreInfo')}
            </Button>
            <Button variant="ghost" onClick={() => openDialog('reject')}>
              {t('reject')}
            </Button>
          </>
        )}
        {canSuspend && (
          <Button variant="danger" onClick={() => openDialog('suspend')}>
            {t('suspend')}
          </Button>
        )}
        {!canDecide && !canSuspend && <p className="text-sm text-text-tertiary">{t('noActionsAvailable')}</p>}
      </div>

      <Dialog open={dialogKind !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          {dialogKind && (
            <>
              <DialogHeader>
                <DialogTitle>{dialogCopy[dialogKind].title}</DialogTitle>
                <DialogDescription>{dialogCopy[dialogKind].description}</DialogDescription>
              </DialogHeader>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('reasonPlaceholder')}
                aria-label={t('reasonLabel')}
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  {t('cancel')}
                </Button>
                <Button
                  variant={dialogKind === 'reject' || dialogKind === 'suspend' ? 'danger' : 'primary'}
                  disabled={reason.trim().length === 0}
                  loading={mutation.isPending}
                  onClick={handleConfirmReasonDialog}
                >
                  {dialogCopy[dialogKind].confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
