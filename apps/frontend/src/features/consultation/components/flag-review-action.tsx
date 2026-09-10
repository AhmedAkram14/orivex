'use client';

import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFlagReview } from '@/features/consultation/hooks/use-flag-review';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from '@/shared/ui/use-toast';

export interface FlagReviewActionProps {
  feedbackId: string;
  doctorProfileId: string;
}

/**
 * I11 -- Admin content moderation (ORIVEX Remaining Work Audit): the
 * reviewed doctor's own precautionary flag on a review about them --
 * immediately removes it from their public profile (the real backend
 * excludes anything not Visible from `listForDoctor`) pending an admin
 * decision, mirroring `CancelAction`'s own confirm-dialog pattern.
 */
export function FlagReviewAction({ feedbackId, doctorProfileId }: FlagReviewActionProps) {
  const t = useTranslations('doctor.profile.flagReview');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const flagReview = useFlagReview(doctorProfileId);

  function closeDialog() {
    setOpen(false);
    setReason('');
    flagReview.reset();
  }

  async function handleConfirm() {
    try {
      await flagReview.mutateAsync({ feedbackId, reason });
      toast({ title: t('toastTitle'), variant: 'success' });
      closeDialog();
    } catch {
      // Inline error rendered below from flagReview.error.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon icon={Flag} size="sm" />
        {t('button')}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t('reasonPlaceholder')}
          rows={3}
        />

        {flagReview.isError && <Alert variant="danger">{t('flagError')}</Alert>}

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            {t('cancel')}
          </Button>
          <Button variant="danger" loading={flagReview.isPending} disabled={reason.trim().length === 0} onClick={handleConfirm}>
            {t('confirmFlag')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
