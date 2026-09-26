'use client';

import { Check, CheckCheck } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useContext } from 'react';
import { AuthContext } from '@/shared/auth/auth-context';
import type { Message } from '@/features/messaging/api/types';
import { MessageAttachment } from '@/features/messaging/components/message-attachment';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface MessageBubbleProps {
  message: Message;
  /** True when the current caller sent this message -- decides bubble side/color and whether a read-receipt icon renders at all (only the sender sees whether their own message was read). */
  isMine: boolean;
}

/** One message row -- mine on the right, theirs on the left, matching every real chat UI convention. Read receipts (single check = sent, double check = read) only ever render on the sender's own outgoing bubbles. */
export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const t = useTranslations('messaging.thread');
  const format = useFormatter();
  // The bubble colour follows the SENDER's role, not the viewer's side: the patient's messages are warm-tinted and the doctor's are a quiet neutral, in both people's views.
  const auth = useContext(AuthContext);
  const viewerIsDoctor = auth?.user?.roles.includes('doctor') ?? false;
  const senderIsPatient = isMine ? !viewerIsDoctor : viewerIsDoctor;

  return (
    <div className={cn('flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3.5 py-2 text-body text-text-primary',
          isMine ? 'rounded-ee-sm' : 'rounded-es-sm',
          senderIsPatient ? 'bg-warm-1' : 'bg-surface-2',
        )}
      >
        {message.body && <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>}
        {message.attachmentAssetId && (
          <div className={cn(message.body && 'mt-2')}>
            <MessageAttachment mediaAssetId={message.attachmentAssetId} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 px-1 text-xs text-text-tertiary">
        <span>{format.dateTime(new Date(message.createdAt), { hour: 'numeric', minute: 'numeric' })}</span>
        {isMine && (
          <Icon
            icon={message.readAt ? CheckCheck : Check}
            size="sm"
            className={message.readAt ? 'text-care-text' : undefined}
            label={message.readAt ? t('read') : t('sent')}
          />
        )}
      </div>
    </div>
  );
}
