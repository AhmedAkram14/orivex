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
type DialogKind = ReasonDialogKind | 'approve';
type LastAction = 'approve' | 'reject' | 'more_info_needed' | 'suspend';

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
 *
 * Phase 4 (Notification & Admin Polish): Approve now goes through the same
 * `Dialog` confirm step as the other three decisions (just without a reason
 * field, since Approve has none), and all four show a success `Alert`
 * after the mutation resolves -- same confirm-then-feedback shape as
 * `AdminPaymentsTable`'s refund flow / `AccountsTable`'s role-change flow.
 */
export function VerificationReviewActions({ verificationCase }: VerificationReviewActionsProps) {
  const t = useTranslations('admin.verificationCase.actions');
  const review = useReviewVerificationCase();
  const suspend = useSuspendVerificationCase();
  const [dialogKind, setDialogKind] = useState<DialogKind | null>(null);
  const [reason, setReason] = useState('');
  const [lastSucceeded, setLastSucceeded] = useState<LastAction | null>(null);

  const mutation = dialogKind === 'suspend' ? suspend : review;
  const error = mutation.error;
  const canDecide = DECIDABLE_STATUSES.has(verificationCase.status);
  const canSuspend = verificationCase.status === 'approved';

  function openDialog(kind: DialogKind) {
    setReason('');
    setDialogKind(kind);
  }

  function closeDialog() {
    setDialogKind(null);
    setReason('');
  }

  async function handleConfirmApprove() {
    setLastSucceeded(null);
    const result = await review.mutateAsync({ id: verificationCase.id, request: { status: 'approved' } }).catch(() => null);
    closeDialog();
    if (result) setLastSucceeded('approve');
  }

  async function handleConfirmReasonDialog() {
    if (!dialogKind || dialogKind === 'approve' || reason.trim().length === 0) return;

    setLastSucceeded(null);
    let succeeded = false;
    if (dialogKind === 'suspend') {
      succeeded = await suspend
        .mutateAsync({ id: verificationCase.id, request: { reason: reason.trim() } })
        .then(() => true)
        .catch(() => false);
    } else {
      const status: VerificationDecisionStatus = dialogKind === 'reject' ? 'rejected' : 'more_info_needed';
      succeeded = await review
        .mutateAsync({ id: verificationCase.id, request: { status, reason: reason.trim() } })
        .then(() => true)
        .catch(() => false);
    }
    closeDialog();
    if (succeeded) setLastSucceeded(dialogKind);
  }

  const reasonDialogCopy: Record<ReasonDialogKind, { title: string; description: string; confirm: string }> = {
    reject: { title: t('rejectDialogTitle'), description: t('rejectDialogDescription'), confirm: t('reject') },
    more_info_needed: {
      title: t('moreInfoDialogTitle'),
      description: t('moreInfoDialogDescription'),
      confirm: t('requestMoreInfo'),
    },
    suspend: { title: t('suspendDialogTitle'), description: t('suspendDialogDescription'), confirm: t('suspend') },
  };

  const successCopy: Record<LastAction, string> = {
    approve: t('approveSucceeded'),
    reject: t('rejectSucceeded'),
    more_info_needed: t('moreInfoSucceeded'),
    suspend: t('suspendSucceeded'),
  };

  return (
    <div className="flex flex-col gap-3">
      {error instanceof ApiError && <Alert variant="danger">{error.message}</Alert>}
      {lastSucceeded && dialogKind === null && <Alert variant="success">{successCopy[lastSucceeded]}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        {canDecide && (
          <>
            <Button loading={review.isPending && dialogKind === 'approve'} onClick={() => openDialog('approve')}>
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

      <Dialog open={dialogKind === 'approve'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approveDialogTitle')}</DialogTitle>
            <DialogDescription>{t('approveDialogDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t('cancel')}
            </Button>
            <Button loading={review.isPending} onClick={handleConfirmApprove}>
              {t('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogKind !== null && dialogKind !== 'approve'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          {dialogKind && dialogKind !== 'approve' && (
            <>
              <DialogHeader>
                <DialogTitle>{reasonDialogCopy[dialogKind].title}</DialogTitle>
                <DialogDescription>{reasonDialogCopy[dialogKind].description}</DialogDescription>
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
                  {reasonDialogCopy[dialogKind].confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
