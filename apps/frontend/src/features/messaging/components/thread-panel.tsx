'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { useMarkThreadRead } from '@/features/messaging/hooks/use-mark-thread-read';
import { useThreadMessages } from '@/features/messaging/hooks/use-thread-messages';
import { MessageBubble } from '@/features/messaging/components/message-bubble';
import { MessageComposer } from '@/features/messaging/components/message-composer';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { MessageCircle } from 'lucide-react';

export interface ThreadPanelProps {
  threadId: string;
  counterpartyName: string | undefined;
}

/** The open thread: message history plus the composer. Marks the other party's messages read once, on open (and again if the caller switches to a different thread). */
export function ThreadPanel({ threadId, counterpartyName }: ThreadPanelProps) {
  const t = useTranslations('messaging.thread');
  const { user } = useAuth();
  const { data: messages, isLoading, isError } = useThreadMessages(threadId);
  const markRead = useMarkThreadRead(threadId);
  const markedThreadIdRef = useRef<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-default px-4 py-3">
        <p className="text-sm font-semibold text-text-primary">{counterpartyName ?? t('unknownCounterparty')}</p>
        <p className="text-xs text-text-tertiary">{t('adminNotice')}</p>
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

      <MessageComposer threadId={threadId} />
    </div>
  );
}
