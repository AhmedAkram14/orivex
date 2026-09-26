'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The consequence, in one sentence: the refund amount, who gets notified, what cannot be undone. */
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Disables both buttons and shows the spinner on the confirm button. */
  loading?: boolean;
  /** `danger` (default) is the solid-red confirm -- the only place a solid danger button is allowed. `neutral` is an ink confirm. */
  tone?: 'danger' | 'neutral';
  /** Extra content between the description and the buttons (an inline error, a reason field). */
  children?: ReactNode;
}

/**
 * Every destructive or consequential action goes through this: cancel an
 * appointment, delete a rating, remove an emergency contact. Title, a
 * consequence sentence, then Cancel + confirm.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  loading = false,
  tone = 'danger',
  children,
}: ConfirmDialogProps) {
  const t = useTranslations('ds.confirm');
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
            {cancelLabel ?? t('cancel')}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'destructive-solid' : 'primary'}
            loading={loading}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
