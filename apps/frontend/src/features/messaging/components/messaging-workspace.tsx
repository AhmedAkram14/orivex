'use client';

import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { useMessageThreads } from '@/features/messaging/hooks/use-message-threads';
import { useStartOrGetThread } from '@/features/messaging/hooks/use-start-or-get-thread';
import { NewConversationItem } from '@/features/messaging/components/new-conversation-item';
import { ThreadListItem } from '@/features/messaging/components/thread-list-item';
import { ThreadPanel } from '@/features/messaging/components/thread-panel';
import { Alert } from '@/shared/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

export interface MessagingWorkspaceProps {
  role: 'patient' | 'doctor';
}

interface CandidateAppointment {
  id: string;
  counterpartyName: string;
  scheduledAt: string;
}

/**
 * I7 -- Messaging (docs/01-prd.md §2.13): the shared inbox+thread workspace
 * both `/patient/messages` and `/doctor/messages` render. Re-threaded
 * (Messages Page Overhaul, Phase 1): one thread per (patientId, doctorId)
 * pair, not per Appointment -- `thread.counterpartyDisplayName` is now
 * resolved server-side, so the inbox rows/open thread panel no longer need
 * any client-side id-matching against the caller's own appointments data.
 * The "start a new conversation" picker still sources its CANDIDATES from
 * each role's own appointments data (`usePatientAppointments`/
 * `useDoctorUpcomingWork`) -- eligibility is still "has a real appointment
 * with this counterparty" -- but starting a thread now needs the
 * counterparty's own PROFILE id, not an appointment id.
 *
 * Known gap, left for Phase 3 (this phase is backend re-threading only,
 * frontend changes here are the minimum needed to keep this page
 * compiling/working against the new DTO shape -- the full merged-list/
 * dedup-by-counterparty redesign is Phase 3's job): `UpcomingWorkItem`
 * (the doctor's candidate source) does not carry a patient profile id
 * today, only an appointment id, so a doctor's "start a conversation" row
 * still passes that appointment id through as if it were a counterparty
 * id. This was already the case before this phase's DTO change and is not
 * newly broken by it; Phase 3's new-message-dialog is expected to source
 * real counterparty ids instead of reusing an appointments feed at all.
 */
export function MessagingWorkspace({ role }: MessagingWorkspaceProps) {
  const t = useTranslations('messaging.inbox');
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);

  const patientAppointments = usePatientAppointments({ enabled: role === 'patient' });
  const doctorUpcomingWork = useDoctorUpcomingWork({ enabled: role === 'doctor' });
  const threadsQuery = useMessageThreads();
  const startOrGetThread = useStartOrGetThread();

  const isLoading = role === 'patient' ? patientAppointments.isLoading : doctorUpcomingWork.isLoading;
  const isError = (role === 'patient' ? patientAppointments.isError : doctorUpcomingWork.isError) || threadsQuery.isError;

  // `id` is a real counterparty PROFILE id for a patient caller (the
  // doctor's own profile id) -- for a doctor caller it's still an
  // appointment id (see the component doc-comment's "known gap" note),
  // since `UpcomingWorkItem` doesn't carry a patient profile id yet.
  const appointments: CandidateAppointment[] = useMemo(() => {
    if (role === 'patient') {
      return (patientAppointments.data ?? []).map((appointment) => ({
        id: appointment.doctorId,
        counterpartyName: appointment.doctorName,
        scheduledAt: appointment.scheduledAt,
      }));
    }
    return (doctorUpcomingWork.data ?? []).map((item) => ({
      id: item.id,
      counterpartyName: item.title,
      scheduledAt: item.scheduledAt,
    }));
  }, [role, patientAppointments.data, doctorUpcomingWork.data]);

  const threads = useMemo(() => threadsQuery.data ?? [], [threadsQuery.data]);
  const threadCounterpartyIds = useMemo(
    () => new Set(threads.map((thread) => (role === 'patient' ? thread.doctorId : thread.patientId))),
    [threads, role],
  );
  const newConversationCandidates = appointments.filter((appointment) => !threadCounterpartyIds.has(appointment.id));

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId);

  async function handleStartConversation(counterpartyProfileId: string) {
    const thread = await startOrGetThread.mutateAsync(counterpartyProfileId);
    setSelectedThreadId(thread.id);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]" style={{ minHeight: '32rem' }}>
      <div className="flex flex-col gap-4">
        {newConversationCandidates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('newConversationTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {newConversationCandidates.map((appointment) => (
                  <NewConversationItem
                    key={appointment.id}
                    counterpartyProfileId={appointment.id}
                    counterpartyName={appointment.counterpartyName}
                    scheduledAt={appointment.scheduledAt}
                    onStart={handleStartConversation}
                    starting={startOrGetThread.isPending && startOrGetThread.variables === appointment.id}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>{t('conversationsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {threads.length === 0 ? (
              <p className="px-1 text-sm text-text-secondary">{t('noConversations')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {threads.map((thread) => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    selected={thread.id === selectedThreadId}
                    onSelect={() => setSelectedThreadId(thread.id)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        {selectedThread ? (
          <ThreadPanel threadId={selectedThread.id} counterpartyName={selectedThread.counterpartyDisplayName} />
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState icon={MessageCircle} title={t('selectConversationTitle')} description={t('selectConversationDescription')} />
          </div>
        )}
      </Card>
    </div>
  );
}
