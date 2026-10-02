'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { WeeklyAvailabilityEditor } from '@/features/scheduling/components/weekly-availability-editor';
import type { RecurringWeeklySchedule } from '@/features/scheduling/types';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';

export interface WeeklyAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: RecurringWeeklySchedule;
}

/**
 * The Weekly Availability dialog: a sticky header (title, one-line subtitle, close), the editor's scrolling body,
 * and its sticky footer. Up to 760px wide; below 640px the shared dialog is a bottom sheet, here full height. Any
 * close while there are unsaved edits -- the ×, Escape, the overlay or Cancel -- asks "Discard changes?" first.
 */
export function WeeklyAvailabilityDialog({
  open,
  onOpenChange,
  schedule,
}: WeeklyAvailabilityDialogProps) {
  const t = useTranslations('scheduling.availability.editor');
  const [dirty, setDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  function close() {
    setDirty(false);
    setConfirmingDiscard(false);
    onOpenChange(false);
  }

  function requestClose() {
    if (dirty) setConfirmingDiscard(true);
    else close();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent
          data-weekly-availability=""
          className="flex max-h-[calc(100dvh-2rem)] max-w-[760px] flex-col overflow-hidden bg-surface p-0 max-sm:h-[calc(100dvh-0.75rem)] max-sm:max-h-none"
        >
          <header className="shrink-0 border-b border-border-default px-6 pt-4 pb-3 pe-12 max-sm:px-4 max-sm:pe-12">
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription className="mt-1">{t('subtitle')}</DialogDescription>
          </header>
          {open && (
            <WeeklyAvailabilityEditor
              schedule={schedule}
              onSaved={close}
              onCancel={requestClose}
              onDirtyChange={setDirty}
            />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title={t('discardTitle')}
        description={t('discardDescription')}
        confirmLabel={t('discardConfirm')}
        cancelLabel={t('keepEditing')}
        onConfirm={close}
      />
    </>
  );
}
