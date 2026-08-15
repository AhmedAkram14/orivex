'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RescheduleFlow } from '@/features/patient/components/appointments/reschedule-flow';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export interface RescheduleActionProps {
  appointmentId: string;
  doctorId: string;
}

/**
 * Patient-Facing Reschedule (Phase 3 Step 2): the reachable entry point into
 * the reschedule flow -- a "Reschedule" button on a Requested/Confirmed
 * appointment card, mirroring `PayNowAction`'s exact open-a-dialog pattern.
 * Closes itself once the flow reports done (either a Free reschedule's
 * immediate success, or a Paid one's payment step completing) -- the
 * appointment list itself refetches via `useRescheduleAppointment`'s own
 * cache invalidation, not a prop this component threads through.
 */
export function RescheduleAction({ appointmentId, doctorId }: RescheduleActionProps) {
  const t = useTranslations('patient.appointments.reschedule');
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('button')}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
        </DialogHeader>
        {open && (
          <RescheduleFlow appointmentId={appointmentId} doctorId={doctorId} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
