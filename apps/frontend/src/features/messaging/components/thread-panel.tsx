'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { useMarkThreadRead } from '@/features/messaging/hooks/use-mark-thread-read';
import { useThreadMessages } from '@/features/messaging/hooks/use-thread-messages';
import { useThreadAppointments } from '@/features/messaging/hooks/use-thread-appointments';
import { setOpenThreadId } from '@/features/messaging/hooks/open-thread-tracker';
import { MessageBubble } from '@/features/messaging/components/message-bubble';
import { MessageComposer } from '@/features/messaging/components/message-composer';
import { getRealtimeSocket } from '@/shared/lib/realtime/use-realtime-socket';
import { isSameCairoDay } from '@/shared/lib/date/timezone';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { ArrowLeft, MessageCircle } from 'lucide-react';

// Messages Page Overhaul (Phase 2): how long a typing indicator stays shown
// after the last `messaging.typing` event for this thread -- if the other
// party stops typing (or closes the tab) without an explicit "stopped"
// signal, this is what actually clears it. Deliberately longer than the
// composer's own ~3s re-emit interval so a steadily-typing counterparty
// never flickers the indicator off between emits.
const TYPING_INDICATOR_TIMEOUT_MS = 5000;

export interface ThreadPanelProps {
  threadId: string;
  counterpartyName: string | undefined;
  /** Realtime layer (Phase 2): who the composer's `messaging.typing` emit targets. Undefined only if the counterparty's own account lookup somehow failed server-side -- the composer simply doesn't emit typing in that case. */
  counterpartyAccountId?: string;
  /** Copy/context (Phase 5): who's looking -- separates the composer's first-use hint copy per role, and gates the patient-chart link (doctor only). Threaded down from `messaging-workspace.tsx`'s own `role` prop, never re-derived. */
  role: 'patient' | 'doctor';
  /** The thread's patient-side identity (`MessageThread.patientId`) -- for the doctor role only, this IS the `PatientProfile` id `/doctor/patients/[id]` resolves against (confirmed against that page's own `params.id` usage), so it's safe to link directly. */
  patientId: string;
  /** Responsive pass (Phase 7): below `md`, `messaging-workspace.tsx` routes
   * between the thread list and this panel instead of stacking both (which
   * required ~2 screens of scroll to reach the composer). When provided,
   * renders a real back button (`md:hidden` -- at `md` and above the list
   * and thread render side-by-side, so there's nothing to "go back" to).
   * Omitted entirely, not just hidden, when the caller has no mobile
   * list/thread routing to go back to. */
  onBack?: () => void;
}

/** The open thread: message history plus the composer. Marks the other party's messages read once, on open (and again if the caller switches to a different thread). */
export function ThreadPanel({ threadId, counterpartyName, counterpartyAccountId, role, patientId, onBack }: ThreadPanelProps) {
  const t = useTranslations('messaging.thread');
  const format = useFormatter();
  const tStatus = useTranslations('publicPatient');
  const { user } = useAuth();
  const { data: messages, isLoading, isError } = useThreadMessages(threadId);
  const { lastAppointment } = useThreadAppointments(threadId);
  const markRead = useMarkThreadRead(threadId);
  const markedThreadIdRef = useRef<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isCounterpartyTyping, setIsCounterpartyTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (markedThreadIdRef.current === threadId) return;
    markedThreadIdRef.current = threadId;
    markRead.mutate();
    // Only re-run when the selected thread itself changes -- markRead is a
    // stable mutation reference per threadId, not a dependency that should
    // retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length]);

  // Messages Page Overhaul (Phase 2): records which thread is "open" for the
  // realtime socket handler's background-thread-toast decision
  // (open-thread-tracker.ts) -- cleared on unmount/thread-change so a closed
  // panel never keeps suppressing its own toast.
  useEffect(() => {
    setOpenThreadId(threadId);
    return () => setOpenThreadId(undefined);
  }, [threadId]);

  // Typing indicator: ephemeral, never persisted, scoped to this thread only
  // (a `messaging.typing` payload for any other thread is ignored). Clears
  // itself after a short silence in case the other party navigates away or
  // stops typing without ever sending anything.
  useEffect(() => {
    setIsCounterpartyTyping(false);
    const socket = getRealtimeSocket();
    if (!socket) return;

    function handleTyping(payload: { threadId: string; fromAccountId: string }) {
      if (payload?.threadId !== threadId) return;
      setIsCounterpartyTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsCounterpartyTyping(false), TYPING_INDICATOR_TIMEOUT_MS);
    }

    socket.on('messaging.typing', handleTyping);
    return () => {
      socket.off('messaging.typing', handleTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [threadId]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-default px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t('backToConversations')}
              className="-ms-1.5 flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-secondary-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:hidden"
            >
              <Icon icon={ArrowLeft} size="sm" flipRtl />
            </button>
          )}
          <p className="text-sm font-semibold text-text-primary">{counterpartyName ?? t('unknownCounterparty')}</p>
          {/* Thread header context (Phase 5), doctor role only: `patientId`
              is confirmed to be a real PatientProfile id (matches what
              `/doctor/patients/[id]/page.tsx` itself resolves its `params.id`
              against), so this never silently 404s. */}
          {role === 'doctor' && patientId && (
            <Link href={`/doctor/patients/${patientId}`} className="text-xs font-medium text-primary hover:underline">
              {t('viewPatientChart')}
            </Link>
          )}
        </div>
        {lastAppointment && (
          <p className="text-xs text-text-tertiary">
            {t('lastAppointment', {
              date: format.dateTime(new Date(lastAppointment.scheduledAt), { dateStyle: 'medium' }),
              status: tStatus(`appointmentStatus.${lastAppointment.status}`),
            })}
          </p>
        )}
        {isCounterpartyTyping && (
          <p className="text-xs italic text-text-tertiary" role="status">
            {t('typingIndicator')}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-2/3" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => {
              // Date separators (Phase 6 UX remediation): a real day-boundary
              // check against the previous message in this same list (Cairo
              // calendar day, matching every other "today"/"this month"
              // comparison in this app -- see `isSameCairoDay`'s own doc
              // comment), not a per-message fabricated label. The first
              // message in the thread always gets one too, so a multi-day
              // thread never opens without dating its own first bubble.
              const previous = messages[index - 1];
              const showDateSeparator = !previous || !isSameCairoDay(new Date(previous.createdAt), new Date(message.createdAt));
              return (
                <div key={message.id} className="flex flex-col gap-3">
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 py-1" role="separator" aria-label={format.dateTime(new Date(message.createdAt), { dateStyle: 'long' })}>
                      <div aria-hidden className="h-px flex-1 bg-border-default" />
                      <span className="shrink-0 text-xs font-medium text-text-tertiary">
                        {format.dateTime(new Date(message.createdAt), { dateStyle: 'medium' })}
                      </span>
                      <div aria-hidden className="h-px flex-1 bg-border-default" />
                    </div>
                  )}
                  <MessageBubble message={message} isMine={message.senderAccountId === user?.id} />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        ) : (
          <EmptyState icon={MessageCircle} title={t('emptyTitle')} description={t('emptyDescription')} />
        )}
      </div>

      <MessageComposer
        threadId={threadId}
        recipientAccountId={counterpartyAccountId}
        role={role}
        isFirstMessage={!isLoading && (messages?.length ?? 0) === 0}
      />
    </div>
  );
}
