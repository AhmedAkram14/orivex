'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useConfirmNoKnownAllergies } from '@/features/doctor/hooks/use-confirm-no-known-allergies';
import { Alert } from '@/shared/ui/alert';
import { Button, type ButtonProps } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export interface ConfirmNoKnownAllergiesDialogProps {
  patientProfileId: string;
  /** The trigger button's own label -- callers use different copy for "first confirm" vs. "re-confirm after staleness". */
  triggerLabel: string;
  triggerVariant?: ButtonProps['variant'];
  triggerSize?: ButtonProps['size'];
  className?: string;
}

/**
 * Phase 3 (Prescribing & Allergy Safety UX), item 7: confirming "no known
 * allergies" writes a real, permanent clinical attestation
 * (`PatientProfile.confirmNoKnownAllergies`, attributed to this doctor) --
 * it must not be a single accidental click. Wraps the action in a real
 * `alertdialog` (Cancel focused by default, per WAI-ARIA Alert Dialog
 * pattern) instead of `AllergyBanner`'s previous bare one-click `Button`.
 * Shared by `AllergyBanner` and the Write Prescription dialog's header so
 * both surfaces use the exact same confirmation step, never two.
 */
export function ConfirmNoKnownAllergiesDialog({
  patientProfileId,
  triggerLabel,
  triggerVariant = 'outline',
  triggerSize = 'sm',
  className,
}: ConfirmNoKnownAllergiesDialogProps) {
  const t = useTranslations('publicPatient');
  const [open, setOpen] = useState(false);
  const confirmNoKnownAllergies = useConfirmNoKnownAllergies(patientProfileId);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  function closeDialog() {
    setOpen(false);
    confirmNoKnownAllergies.reset();
  }

  async function handleConfirm() {
    try {
      await confirmNoKnownAllergies.mutateAsync();
      setOpen(false);
    } catch {
      // Inline error rendered below from confirmNoKnownAllergies.error.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <Button type="button" variant={triggerVariant} size={triggerSize} className={className} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <DialogContent
        role="alertdialog"
        aria-describedby="confirm-no-known-allergies-description"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelButtonRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('confirmNoKnownAllergiesDialogTitle')}</DialogTitle>
          <DialogDescription id="confirm-no-known-allergies-description">
            {t('confirmNoKnownAllergiesDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {confirmNoKnownAllergies.isError && (
          <Alert variant="danger" role="alert">
            {t('confirmNoKnownAllergiesError')}
          </Alert>
        )}

        <DialogFooter>
          <Button ref={cancelButtonRef} type="button" variant="outline" onClick={closeDialog}>
            {t('confirmNoKnownAllergiesCancelAction')}
          </Button>
          <Button type="button" loading={confirmNoKnownAllergies.isPending} onClick={handleConfirm}>
            {t('confirmNoKnownAllergiesConfirmAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
