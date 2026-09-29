'use client';

import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CancelAction } from '@/features/patient/components/appointments/cancel-action';
import { RescheduleAction } from '@/features/patient/components/appointments/reschedule-action';
import { useDownloadAppointmentCalendarInvite } from '@/features/patient/hooks/use-download-appointment-calendar-invite';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

export interface AppointmentOverflowMenuProps {
  appointmentId: string;
  doctorId: string;
  canAddToCalendar: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  willRefund: boolean;
}

/**
 * The secondary actions of an appointment row, behind one ⋯ menu (the same pattern as "Needs your
 * attention"), so a row shows at most its one primary action plus this menu. Reschedule and Cancel
 * open their existing dialogs -- Cancel still asks for confirmation before anything happens.
 * Renders nothing when no secondary action applies.
 */
export function AppointmentOverflowMenu({
  appointmentId,
  doctorId,
  canAddToCalendar,
  canReschedule,
  canCancel,
  willRefund,
}: AppointmentOverflowMenuProps) {
  const tHome = useTranslations('patientHome');
  const tCalendar = useTranslations('patient.appointments.addToCalendar');
  const tReschedule = useTranslations('patient.appointments.reschedule');
  const tCancel = useTranslations('patient.appointments.cancel');
  const downloadInvite = useDownloadAppointmentCalendarInvite();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!canAddToCalendar && !canReschedule && !canCancel) return null;

  return (
    <>
      {/* Non-modal, so closing the menu never fights the dialog it just opened for focus. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={tHome('more')}>
            <Icon icon={MoreHorizontal} size="sm" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canAddToCalendar && (
            <DropdownMenuItem disabled={downloadInvite.isPending} onSelect={() => downloadInvite.mutate(appointmentId)}>
              {tCalendar('button')}
            </DropdownMenuItem>
          )}
          {canReschedule && <DropdownMenuItem onSelect={() => setRescheduleOpen(true)}>{tReschedule('button')}</DropdownMenuItem>}
          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger-emphasis" onSelect={() => setCancelOpen(true)}>
                {tCancel('button')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canReschedule && (
        <RescheduleAction appointmentId={appointmentId} doctorId={doctorId} showTrigger={false} open={rescheduleOpen} onOpenChange={setRescheduleOpen} />
      )}
      {canCancel && (
        <CancelAction appointmentId={appointmentId} willRefund={willRefund} showTrigger={false} open={cancelOpen} onOpenChange={setCancelOpen} />
      )}
    </>
  );
}
