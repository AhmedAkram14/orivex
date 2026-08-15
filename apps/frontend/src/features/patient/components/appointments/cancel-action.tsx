'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCancelAppointment } from '@/features/patient/hooks/use-cancel-appointment';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export interface CancelActionProps {
  appointmentId: string;
  /**
   * True exactly when cancelling this appointment triggers a real refund --
   * a Paid appointment that is already Confirmed (paid). A still-Requested
   * Paid appointment hasn't been charged yet, and a Free appointment is
   * never charged at all, so neither gets the refund copy. Picks the honest
   * confirm-dialog message; never a fabricated cutoff/partial-refund policy
   * (cancellation is always allowed from Requested/Confirmed, matching the
   * backend exactly, and any refund is fully automatic and unconditional).
   */
  willRefund: boolean;
}

/**
 * Demo Readiness P0: the previously-missing patient-facing cancel action --
 * a "Cancel" button on a Requested/Confirmed appointment card, mirroring
 * `RescheduleAction`'s exact open-a-dialog pattern but simpler (a plain
 * confirm, not a multi-step flow): `PATCH /appointments/:id`,
 * `{ action: 'cancel' }` is a single, real, complete mutation -- the
 * backend's own slot release, auto-refund
 * (`AutoRefundOnAppointmentCancellationHandler`), and refund notification
 * all fire server-side, nothing left for this component to orchestrate.
 */
export function CancelAction({ appointmentId, willRefund }: CancelActionProps) {
  const t = useTranslations('patient.appointments.cancel');
  const [open, setOpen] = useState(false);
  const cancelAppointment = useCancelAppointment();

  // Real, distinct error states (never a single generic message): a 404/422
  // means the appointment already changed state elsewhere (not found/not
  // owned, or already cancelled/completed in another tab) -- there is no
  // "retry the same action" recovery for that, only acknowledging it and
  // letting the caller close (the list itself already refetches via
  // useCancelAppointment's own onError invalidation). Any other error
  // (network/5xx) is a real transient failure -- retrying is reasonable.
  const apiError = cancelAppointment.error instanceof ApiError ? cancelAppointment.error : undefined;
  const isInvalidStateError = apiError?.status === 422;
  const isNotFoundError = apiError?.status === 404;
  const isTerminalError = isInvalidStateError || isNotFoundError;

  function closeDialog() {
    setOpen(false);
    cancelAppointment.reset();
  }

  async function handleConfirm() {
    try {
      await cancelAppointment.mutateAsync({ appointmentId });
      setOpen(false);
    } catch {
      // Inline error rendered below from cancelAppointment.error.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('button')}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{willRefund ? t('confirmDescriptionRefund') : t('confirmDescription')}</DialogDescription>
        </DialogHeader>

        {cancelAppointment.isError && (
          <Alert variant="danger" role="alert">
            {isNotFoundError
              ? t('notFoundError')
              : isInvalidStateError
                ? t('invalidStateError')
                : apiError
                  ? apiError.message
                  : t('genericError')}
          </Alert>
        )}

        <DialogFooter>
          {isTerminalError ? (
            <Button onClick={closeDialog}>{t('close')}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={closeDialog}>
                {t('keepAppointment')}
              </Button>
              <Button variant="danger" loading={cancelAppointment.isPending} onClick={handleConfirm}>
                {t('confirmCancel')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
