'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCancelDoctorAppointment } from '@/features/doctor/hooks/use-cancel-doctor-appointment';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export interface CancelAppointmentDialogProps {
  appointmentId: string;
  /** True when this cancel triggers a real refund -- a Paid appointment already Confirmed (charged). Mirrors `patient/components/appointments/cancel-action.tsx`'s own `willRefund` reasoning. */
  willRefund: boolean;
}

/**
 * Phase 2 (Appointment Visibility & Consultation History): the ONLY action
 * offered on a "Needs resolution" appointment (a past-dated, non-terminal
 * appointment nobody ever resolved). Per IMPLEMENTATION_NOTES.md's Phase 0
 * finding (b), `complete()`/`markNoShow()` are system-only transitions --
 * there is no doctor-facing route for either, so this deliberately does NOT
 * offer them, and explains why in the dialog copy rather than silently
 * omitting them. Cancel is real and complete: `PATCH /appointments/:id`
 * (`useCancelDoctorAppointment`) releases the slot and, for an already-paid
 * Confirmed appointment, triggers an automatic refund server-side.
 */
export function CancelAppointmentDialog({ appointmentId, willRefund }: CancelAppointmentDialogProps) {
  const t = useTranslations('doctor.appointments.cancel');
  const [open, setOpen] = useState(false);
  const cancelAppointment = useCancelDoctorAppointment();

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

        <p className="text-sm text-text-tertiary">{t('whyNotCompleteExplainer')}</p>

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
