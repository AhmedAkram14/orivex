'use client';

import { FileUp, ListPlus, MessageSquare, MoreHorizontal, Pill, Printer, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useStartOrGetThread } from '@/features/messaging/hooks/use-start-or-get-thread';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Icon } from '@/shared/icons/icon';
import { useRouter } from '@/shared/i18n/navigation';

export interface PatientRecordHeaderActionsProps {
  patientProfileId: string;
  hasUpcomingAppointment: boolean;
  canWritePrescription: boolean;
  onWritePrescription: () => void;
  onAddCondition: () => void;
  onUploadDocument: () => void;
}

// P1 header actions. Deliberately does NOT include "Book appointment" (no
// doctor-initiated-booking flow exists anywhere in this app) or a specific
// "resume this consultation" deep link (the Queue page is keyed by
// consultationSessionId, not appointmentId -- there is no such link to build
// honestly). "Open in Queue" is a plain, undecorated link to the Queue page,
// shown only when an upcoming appointment exists, not a claim of a specific
// deep link this app doesn't support.
export function PatientRecordHeaderActions({
  patientProfileId,
  hasUpcomingAppointment,
  canWritePrescription,
  onWritePrescription,
  onAddCondition,
  onUploadDocument,
}: PatientRecordHeaderActionsProps) {
  const t = useTranslations('publicPatient');
  const router = useRouter();
  const startOrGetThread = useStartOrGetThread();
  const [open, setOpen] = useState(false);

  async function handleMessage() {
    const thread = await startOrGetThread.mutateAsync(patientProfileId);
    router.push(`/doctor/messages?thread=${thread.id}`);
  }

  return (
    <div className="print-hidden flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" loading={startOrGetThread.isPending} onClick={handleMessage}>
          <Icon icon={MessageSquare} size="sm" />
          {t('messagePatient')}
        </Button>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label={t('moreActions')}>
              <Icon icon={MoreHorizontal} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canWritePrescription && (
              <DropdownMenuItem onSelect={() => onWritePrescription()}>
                <Icon icon={Pill} size="sm" />
                {t('writePrescription')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onAddCondition()}>
              <Icon icon={ListPlus} size="sm" />
              {t('addCondition')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUploadDocument()}>
              <Icon icon={FileUp} size="sm" />
              {t('uploadDocument')}
            </DropdownMenuItem>
            {hasUpcomingAppointment && (
              <DropdownMenuItem onSelect={() => router.push('/doctor/queue')}>
                <Icon icon={Video} size="sm" />
                {t('openInQueue')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => window.print()}>
              <Icon icon={Printer} size="sm" />
              {t('printRecord')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {startOrGetThread.isError && <Alert variant="danger">{t('messagePatientError')}</Alert>}
    </div>
  );
}
