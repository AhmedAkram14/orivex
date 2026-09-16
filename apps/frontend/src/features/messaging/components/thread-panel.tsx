'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { useMarkThreadRead } from '@/features/messaging/hooks/use-mark-thread-read';
import { useThreadMessages } from '@/features/messaging/hooks/use-thread-messages';
import { setOpenThreadId } from '@/features/messaging/hooks/open-thread-tracker';
import { MessageBubble } from '@/features/messaging/components/message-bubble';
import { MessageComposer } from '@/features/messaging/components/message-composer';
import { getRealtimeSocket } from '@/shared/lib/realtime/use-realtime-socket';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { MessageCircle } from 'lucide-react';

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
}

/** The open thread: message history plus the composer. Marks the other party's messages read once, on open (and again if the caller switches to a different thread). */
export function ThreadPanel({ threadId, counterpartyName, counterpartyAccountId }: ThreadPanelProps) {
  const t = useTranslations('messaging.thread');
  const { user } = useAuth();
  const { data: messages, isLoading, isError } = useThreadMessages(threadId);
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
        <p className="text-sm font-semibold text-text-primary">{counterpartyName ?? t('unknownCounterparty')}</p>
        <p className="text-xs text-text-tertiary">{t('adminNotice')}</p>
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
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} isMine={message.senderAccountId === user?.id} />
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          <EmptyState icon={MessageCircle} title={t('emptyTitle')} description={t('emptyDescription')} />
        )}
      </div>

      <MessageComposer threadId={threadId} recipientAccountId={counterpartyAccountId} />
    </div>
  );
}
