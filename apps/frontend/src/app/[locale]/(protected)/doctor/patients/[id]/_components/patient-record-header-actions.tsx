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
//
// Phase 6 UX remediation: "Write prescription" and "Add condition" used to
// be buried inside the "..." overflow menu while "Message patient" was the
// only visible primary action -- the two most frequent clinical actions on
// this page were the hardest to find. Both are now real, visible secondary
// buttons next to "Message patient"; "Write prescription" only when at
// least one eligible (completed, session-backed) appointment exists, same
// gating the old menu item already had. Upload document/Print record stay
// in the overflow menu -- they're lower-frequency and the header already has
// three visible buttons plus the counterparty-facing "Open in Queue" link.
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" loading={startOrGetThread.isPending} onClick={handleMessage}>
          <Icon icon={MessageSquare} size="sm" />
          {t('messagePatient')}
        </Button>

        {canWritePrescription && (
          <Button type="button" variant="outline" size="sm" onClick={onWritePrescription}>
            <Icon icon={Pill} size="sm" />
            {t('writePrescription')}
          </Button>
        )}

        <Button type="button" variant="outline" size="sm" onClick={onAddCondition}>
          <Icon icon={ListPlus} size="sm" />
          {t('addCondition')}
        </Button>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label={t('moreActions')}>
              <Icon icon={MoreHorizontal} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
