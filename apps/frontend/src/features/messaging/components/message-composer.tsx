'use client';

import { Paperclip, Send, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useSendMessage } from '@/features/messaging/hooks/use-send-message';
import { useUploadMediaAsset } from '@/shared/media/hooks/use-upload-media-asset';
import { getRealtimeSocket } from '@/shared/lib/realtime/use-realtime-socket';
import { useAutoGrowTextarea } from '@/shared/hooks/use-auto-grow-textarea';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';

// Mirrors the precedent at
// `features/patient/components/records/clinical-document-upload.tsx`'s
// `accept` attribute exactly.
const ACCEPTED_FILE_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
// Client-side only -- advisory, not enforced anywhere server-side today
// (AssetModule's upload-intent flow has no size/type check; pre-existing
// gap, out of scope to close this pass).
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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
  const [attachmentRejection, setAttachmentRejection] = useState<'tooLarge' | 'typeNotAllowed' | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const upload = useUploadMediaAsset();
  const sendMessage = useSendMessage(threadId);
  const lastTypingEmitAtRef = useRef(0);

  useAutoGrowTextarea(textareaRef, body);

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

    setAttachmentRejection(undefined);
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setAttachmentRejection('typeNotAllowed');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentRejection('tooLarge');
      return;
    }

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
      setAttachmentRejection(undefined);
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Real <form> semantics so a mobile keyboard's "Go"/IME submit action
    // (which never fires a textarea `onKeyDown`) sends the message too --
    // the `onKeyDown` Enter-to-send handler above stays for desktop.
    event.preventDefault();
    void handleSend();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border-default p-3">
      {sendMessage.isError && <Alert variant="danger">{t('sendError')}</Alert>}
      {upload.isError && <Alert variant="danger">{t('attachmentUploadError')}</Alert>}
      {attachmentRejection === 'tooLarge' && <Alert variant="danger">{t('attachmentTooLarge')}</Alert>}
      {attachmentRejection === 'typeNotAllowed' && <Alert variant="danger">{t('attachmentTypeNotAllowed')}</Alert>}

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
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS}
          className="hidden"
          onChange={handleFileSelected}
        />
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
          ref={textareaRef}
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
        <Button type="submit" disabled={!canSend} loading={sendMessage.isPending} aria-label={t('send')}>
          <Icon icon={Send} size="sm" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-text-tertiary">
        <span>{t('composerHint')}</span>
        <span>{t('attachmentHint')}</span>
      </div>
    </form>
  );
}
