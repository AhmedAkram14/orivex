'use client';

import { MessageCircle, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { useMessageThreads } from '@/features/messaging/hooks/use-message-threads';
import { useStartOrGetThread } from '@/features/messaging/hooks/use-start-or-get-thread';
import { useNewMessageAnnouncer } from '@/features/messaging/hooks/use-new-message-announcer';
import { NewMessageDialog } from '@/features/messaging/components/new-message-dialog';
import { ThreadListItem } from '@/features/messaging/components/thread-list-item';
import { ThreadPanel } from '@/features/messaging/components/thread-panel';
import { usePathname, useRouter } from '@/shared/i18n/navigation';
import { useRealtimeConnectionState } from '@/shared/lib/realtime/use-realtime-socket';
import { cn } from '@/shared/lib/cn';
import { Alert } from '@/shared/ui/alert';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Heading } from '@/design-system/typography';

export interface MessagingWorkspaceProps {
  role: 'patient' | 'doctor';
}

interface CandidateAppointment {
  /** A real counterparty PROFILE id -- both roles' candidate sources now carry one. */
  counterpartyProfileId: string;
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
 *
 * Merged-inbox redesign (Phase 3): the old permanent "Start a conversation"
 * card + separate "Conversations" card are gone -- a single list of
 * `ThreadListItem`s (server-ordered by `lastMessageAt` desc, never
 * re-sorted client-side), a "New message" button opening `NewMessageDialog`,
 * a client-side search filter, `?thread=` URL state, an sr-only heading,
 * and an aria-live announcer for new messages.
 *
 * Counterparty-profile-id gap (flagged in Phase 1, resolved here): the
 * doctor's candidate source, `UpcomingWorkItem`, now carries a real
 * `patientId` (additive DTO field, Phase 3) -- both roles' candidate lists
 * key `StartOrGetMessageThreadUseCase` by a genuine counterparty PROFILE id,
 * never an appointment id.
 */
export function MessagingWorkspace({ role }: MessagingWorkspaceProps) {
  const t = useTranslations('messaging.inbox');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // ?thread=<id> URL state (Phase 3): mirrors the doctor patient-chart
  // page's own `?tab=` pattern exactly -- `router.replace` (not `push`, so
  // switching threads doesn't spam browser history) with `scroll: false`.
  const selectedThreadId = searchParams.get('thread') ?? undefined;
  function selectThread(threadId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('thread', threadId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }
  // Responsive pass (Phase 7): below `md`, clearing `?thread=` is how the
  // mobile "back" button returns from the thread view to the list view (see
  // the `hidden md:flex`/`md:hidden` pairing below) -- at `md` and above
  // both panes are always visible side-by-side, so this is only ever
  // triggered by ThreadPanel's `onBack`, itself only rendered `md:hidden`.
  function clearSelectedThread() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('thread');
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // Connection-state indicator (Phase 2 audit finding): a dropped socket
  // otherwise silently degrades to the ~60s fallback poll with nothing on
  // screen saying so.
  const isRealtimeConnected = useRealtimeConnectionState();

  const patientAppointments = usePatientAppointments({ enabled: role === 'patient' });
  const doctorUpcomingWork = useDoctorUpcomingWork({ enabled: role === 'doctor' });
  const threadsQuery = useMessageThreads();
  const startOrGetThread = useStartOrGetThread();

  const isLoading = role === 'patient' ? patientAppointments.isLoading : doctorUpcomingWork.isLoading;
  const isError = (role === 'patient' ? patientAppointments.isError : doctorUpcomingWork.isError) || threadsQuery.isError;

  // Both roles' candidate sources now carry a real counterparty PROFILE id:
  // a patient caller's own appointments carry `doctorId`; a doctor caller's
  // `UpcomingWorkItem` now carries `patientId` (Phase 3 additive DTO field
  // -- see this component's own doc-comment for the gap this closes).
  const appointments: CandidateAppointment[] = useMemo(() => {
    if (role === 'patient') {
      return (patientAppointments.data ?? []).map((appointment) => ({
        counterpartyProfileId: appointment.doctorId,
        counterpartyName: appointment.doctorName,
        scheduledAt: appointment.scheduledAt,
      }));
    }
    return (doctorUpcomingWork.data ?? []).map((item) => ({
      counterpartyProfileId: item.patientId,
      counterpartyName: item.title,
      scheduledAt: item.scheduledAt,
    }));
  }, [role, patientAppointments.data, doctorUpcomingWork.data]);

  const threads = useMemo(() => threadsQuery.data ?? [], [threadsQuery.data]);
  // Sort order (Phase 3): the backend already returns threads ordered by
  // `lastMessageAt` desc (Phase 1's `findByPatientId`/`findByDoctorId`) --
  // this deliberately does NOT re-sort client-side, only trusts it.
  const threadCounterpartyIds = useMemo(
    () => new Set(threads.map((thread) => (role === 'patient' ? thread.doctorId : thread.patientId))),
    [threads, role],
  );

  // New-message candidates (Phase 3): deduplicated per counterparty -- a
  // patient/patient with several historical appointments appears once, not
  // once per appointment. Keeps the most recent `scheduledAt` per
  // counterparty for display.
  const newConversationCandidates = useMemo(() => {
    const byCounterpartyId = new Map<string, CandidateAppointment>();
    for (const appointment of appointments) {
      if (threadCounterpartyIds.has(appointment.counterpartyProfileId)) continue;
      const existing = byCounterpartyId.get(appointment.counterpartyProfileId);
      if (!existing || new Date(appointment.scheduledAt) > new Date(existing.scheduledAt)) {
        byCounterpartyId.set(appointment.counterpartyProfileId, appointment);
      }
    }
    return Array.from(byCounterpartyId.values());
  }, [appointments, threadCounterpartyIds]);

  // Search (Phase 3): client-side only, filtering the already-fetched
  // thread list on `counterpartyDisplayName`. Correct only while the full
  // thread list is fetched unpaginated (`useMessageThreads` has no
  // pagination today) -- if/when this list gains pagination, this needs to
  // move server-side, or it'll silently search only the current page.
  const filteredThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) => (thread.counterpartyDisplayName ?? '').toLowerCase().includes(query));
  }, [threads, searchQuery]);

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId);
  const announcement = useNewMessageAnnouncer(threads);

  async function handleStartConversation(counterpartyProfileId: string) {
    const thread = await startOrGetThread.mutateAsync(counterpartyProfileId);
    selectThread(thread.id);
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
    <div className="flex flex-col gap-2">
      {!isRealtimeConnected && (
        <p className="text-xs text-text-tertiary" role="status">
          {t('reconnecting')}
        </p>
      )}
      {/* Screen-reader-only announcer (Phase 3): the sighted-user-facing
          background-thread toast already lives in use-realtime-socket.ts
          (Phase 2) -- this is the complementary, non-visual mechanism. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]" style={{ minHeight: '32rem' }}>
        {/* Responsive pass (Phase 7): below `md` (768px) this grid was still
            a single column (the two-pane split only kicks in at `lg`), which
            stacked the full conversation list above the full open thread on
            one scrollable page -- reaching the composer took ~2 screens of
            scroll. Below `md`, a selected thread now hides the list card
            entirely (and vice versa) so exactly one pane renders full-height,
            with ThreadPanel's own back button (`md:hidden`) returning to the
            list. At `md` and above this is unchanged from before -- both
            `hidden md:flex` guards are no-ops there. */}
        <Card className={cn('flex flex-col', selectedThreadId && 'hidden md:flex')}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            {/* Heading hierarchy (Phase 3): mirrors the doctor patient-chart
                page's own H1 -> H2 fix -- the workspace H1 (page title) is
                rendered by WorkspaceHeader above this component, so this
                sr-only H2 keeps the outline from skipping straight to the
                thread rows' implicit level, without changing the visual
                design. */}
            <Heading level={2} className="sr-only">
              {t('conversationsTitle')}
            </Heading>
            <NewMessageDialog
              candidates={newConversationCandidates}
              onStart={handleStartConversation}
              starting={startOrGetThread.isPending}
              startingCounterpartyProfileId={startOrGetThread.variables}
            />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="relative">
              <Icon icon={Search} size="sm" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
                className="ps-9"
              />
            </div>

            {threads.length === 0 ? (
              <p className="px-1 text-sm text-text-secondary">{t('noConversations')}</p>
            ) : filteredThreads.length === 0 ? (
              <p className="px-1 text-sm text-text-secondary">{t('noSearchResults')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {filteredThreads.map((thread) => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    selected={thread.id === selectedThreadId}
                    onSelect={() => selectThread(thread.id)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className={cn('overflow-hidden p-0', !selectedThreadId && 'hidden md:flex')}>
          {selectedThread ? (
            <ThreadPanel
              threadId={selectedThread.id}
              counterpartyName={selectedThread.counterpartyDisplayName}
              counterpartyAccountId={selectedThread.counterpartyAccountId}
              role={role}
              patientId={selectedThread.patientId}
              onBack={clearSelectedThread}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState icon={MessageCircle} title={t('selectConversationTitle')} description={t('selectConversationDescription')} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
