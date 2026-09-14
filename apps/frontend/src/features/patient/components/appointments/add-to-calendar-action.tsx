'use client';

import { CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDownloadAppointmentCalendarInvite } from '@/features/patient/hooks/use-download-appointment-calendar-invite';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';

export interface AddToCalendarActionProps {
  appointmentId: string;
}

/**
 * K11 -- Calendar sync boundary (ORIVEX Remaining Work Audit). Downloads a
 * real, standard `.ics` file for this appointment via `GET
 * /appointments/:id/calendar.ics` -- no OAuth, no external provider, just
 * this appointment's own real data. A single button, not a dialog: the
 * action is a single idempotent download, no confirmation is meaningful.
 */
export function AddToCalendarAction({ appointmentId }: AddToCalendarActionProps) {
  const t = useTranslations('patient.appointments.addToCalendar');
  const downloadInvite = useDownloadAppointmentCalendarInvite();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={downloadInvite.isPending}
      onClick={() => downloadInvite.mutate(appointmentId)}
    >
      <Icon icon={CalendarPlus} size="sm" />
      {t('button')}
    </Button>
  );
}
