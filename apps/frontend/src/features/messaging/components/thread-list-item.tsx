'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { MessageThread } from '@/features/messaging/api/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { cn } from '@/shared/lib/cn';

export interface ThreadListItemProps {
  thread: MessageThread;
  selected: boolean;
  onSelect: () => void;
}

// Re-threading (Phase 1) + merged-inbox redesign (Phase 3):
// `counterpartyDisplayName` comes resolved server-side on the thread itself
// -- the old client-side id-matching against the caller's own appointments
// list is gone, and so is the per-appointment label line (no `appointmentId`
// exists anymore). The secondary line prefers the doctor UX audit
// remediation's `lastMessagePreview` (Phase 6 backend proposal, now
// implemented) when the thread has a message; falls back to a relative
// rendering of `thread.lastMessageAt` via `useFormatter().relativeTime()`
// (the same mechanism `notification-panel.tsx`/`recent-activity.tsx` already
// use) for a genuinely empty thread, where there is no message to preview.
export function ThreadListItem({ thread, selected, onSelect }: ThreadListItemProps) {
  const t = useTranslations('messaging.inbox');
  const format = useFormatter();
  const displayName = thread.counterpartyDisplayName ?? t('unknownCounterparty');
  const initial = displayName.charAt(0).toUpperCase();
  const hasUnread = (thread.unreadCount ?? 0) > 0;
  // `null` (not `undefined`) is the server's explicit "no messages yet" --
  // such a thread has no meaningful last-activity time to show.
  const secondaryLine =
    thread.lastMessagePreview === null
      ? t('noMessagesYet')
      : (thread.lastMessagePreview ?? format.relativeTime(new Date(thread.lastMessageAt), new Date()));

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
          selected ? 'bg-primary-subtle' : 'hover:bg-secondary-subtle',
        )}
      >
        {/* Accessible name fix (Phase 5): without `aria-hidden`, the
            fallback's single-letter text node concatenates into the
            button's own accessible name (e.g. "A, Ahmed Hassan") -- the
            avatar is purely decorative next to the adjacent name text. */}
        <Avatar size="md" aria-hidden="true">
          {thread.counterpartyAvatarUrl && <AvatarImage src={thread.counterpartyAvatarUrl} alt="" />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('truncate text-sm', hasUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-primary')}>
              {displayName}
            </p>
            {hasUnread && (
              <>
                <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span className="sr-only">{t('unread')}</span>
              </>
            )}
          </div>
          <p className={cn('truncate text-xs', hasUnread ? 'font-medium text-text-secondary' : 'text-text-tertiary')}>
            {secondaryLine}
          </p>
        </div>
      </button>
    </li>
  );
}
