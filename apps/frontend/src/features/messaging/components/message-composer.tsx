'use client';

import { Paperclip, Send, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useSendMessage } from '@/features/messaging/hooks/use-send-message';
import { useUploadMediaAsset } from '@/shared/media/hooks/use-upload-media-asset';
import { getRealtimeSocket } from '@/shared/lib/realtime/use-realtime-socket';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';

export interface MessageComposerProps {
  threadId: string;
  /** Realtime layer (Phase 2): who a `messaging.typing` emit is addressed to. Typing is simply never emitted when this is unknown (a rare counterparty-lookup failure server-side) -- there's no meaningful fallback recipient. */
  recipientAccountId?: string;
}

// Typing indicator: re-emit at most this often while the user keeps typing,
// rather than on every keystroke -- ephemeral, low-stakes signal (per
// docs/06-system-architecture.md §6), no need for finer granularity than
// this.
const TYPING_EMIT_INTERVAL_MS = 3000;

/** The send form -- a body textarea plus one optional attachment, reusing the same real upload-intent -> PUT -> confirm flow (`useUploadMediaAsset`) every other attachment control in this app already uses. */
export function MessageComposer({ threadId, recipientAccountId }: MessageComposerProps) {
  const t = useTranslations('messaging.thread');
  const [body, setBody] = useState('');
  const [attachmentFileName, setAttachmentFileName] = useState<string | undefined>(undefined);
  const [attachmentAssetId, setAttachmentAssetId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMediaAsset();
  const sendMessage = useSendMessage(threadId);
  const lastTypingEmitAtRef = useRef(0);

  const canSend = (body.trim().length > 0 || Boolean(attachmentAssetId)) && !sendMessage.isPending && !upload.isPending;

  function emitTyping() {
    if (!recipientAccountId) return;
    const now = Date.now();
    if (now - lastTypingEmitAtRef.current < TYPING_EMIT_INTERVAL_MS) return;
    lastTypingEmitAtRef.current = now;
    getRealtimeSocket()?.emit('messaging.typing', { threadId, recipientAccountId });
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const asset = await upload.mutateAsync({ file, purpose: 'message_attachment' });
      setAttachmentAssetId(asset.id);
      setAttachmentFileName(file.name);
    } catch {
      // Inline error rendered below from upload.error.
    }
  }

  function removeAttachment() {
    setAttachmentAssetId(undefined);
    setAttachmentFileName(undefined);
  }

  async function handleSend() {
    if (!canSend) return;
    try {
      await sendMessage.mutateAsync({ body: body.trim(), attachmentAssetId });
      setBody('');
      removeAttachment();
    } catch {
      // Inline error rendered below from sendMessage.error.
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border-default p-3">
      {sendMessage.isError && <Alert variant="danger">{t('sendError')}</Alert>}
      {upload.isError && <Alert variant="danger">{t('attachmentUploadError')}</Alert>}

      {attachmentFileName && (
        <div className="flex w-fit items-center gap-2 rounded-md bg-secondary-subtle px-2.5 py-1 text-xs text-text-secondary">
          <Icon icon={Paperclip} size="xs" />
          {attachmentFileName}
          <button type="button" onClick={removeAttachment} aria-label={t('removeAttachment')}>
            <Icon icon={X} size="xs" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileSelected} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => inputRef.current?.click()}
          loading={upload.isPending}
          aria-label={t('attachFile')}
        >
          <Icon icon={Paperclip} size="sm" />
        </Button>
        <Textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            emitTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('composerPlaceholder')}
          rows={1}
          className="min-h-10 flex-1 resize-none"
        />
        <Button type="button" onClick={handleSend} disabled={!canSend} loading={sendMessage.isPending} aria-label={t('send')}>
          <Icon icon={Send} size="sm" />
        </Button>
      </div>
    </div>
  );
}
