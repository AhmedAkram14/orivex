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
 * both `/patient/messages` and `/doctor/messages` render. One thread per
 * Appointment (matches the real backend exactly) -- since `MessageThread`
 * never carries a display name (only `patientId`/`doctorId`), the
 * counterparty name for both the inbox rows and the "start a new
 * conversation" picker is resolved client-side from each role's own real
 * appointments data (`usePatientAppointments`/`useDoctorUpcomingWork`,
 * both already keyed by real Appointment ids). A thread whose appointment
 * has fallen out of that list (a doctor's view only covers upcoming work)
 * still opens and works -- it just shows a generic counterparty label,
 * never a fabricated one.
 */
export function MessagingWorkspace({ role }: MessagingWorkspaceProps) {
  const t = useTranslations('messaging.inbox');
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);

  const patientAppointments = usePatientAppointments();
  const doctorUpcomingWork = useDoctorUpcomingWork();
  const threadsQuery = useMessageThreads();
  const startOrGetThread = useStartOrGetThread();

  const isLoading = role === 'patient' ? patientAppointments.isLoading : doctorUpcomingWork.isLoading;
  const isError = (role === 'patient' ? patientAppointments.isError : doctorUpcomingWork.isError) || threadsQuery.isError;

  const appointments: CandidateAppointment[] = useMemo(() => {
    if (role === 'patient') {
      return (patientAppointments.data ?? []).map((appointment) => ({
        id: appointment.id,
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

  const counterpartyNameByAppointmentId = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment.counterpartyName])),
    [appointments],
  );

  const threads = useMemo(() => threadsQuery.data ?? [], [threadsQuery.data]);
  const threadAppointmentIds = useMemo(() => new Set(threads.map((thread) => thread.appointmentId)), [threads]);
  const newConversationCandidates = appointments.filter((appointment) => !threadAppointmentIds.has(appointment.id));

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId);

  async function handleStartConversation(appointmentId: string) {
    const thread = await startOrGetThread.mutateAsync(appointmentId);
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
                    appointmentId={appointment.id}
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
                    counterpartyName={counterpartyNameByAppointmentId.get(thread.appointmentId)}
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
          <ThreadPanel
            threadId={selectedThread.id}
            counterpartyName={counterpartyNameByAppointmentId.get(selectedThread.appointmentId)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState icon={MessageCircle} title={t('selectConversationTitle')} description={t('selectConversationDescription')} />
          </div>
        )}
      </Card>
    </div>
  );
}
