'use client';

import { useTranslations } from 'next-intl';
import type { MessageThread } from '@/features/messaging/api/types';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';

export interface ThreadListItemProps {
  thread: MessageThread;
  /** Resolved client-side from the caller's own appointments list (the API never returns a display name, only patientId/doctorId) -- falls back to a generic label when the source appointment has since fallen out of that list (e.g. an old appointment on a doctor's upcoming-only view). */
  counterpartyName: string | undefined;
  selected: boolean;
  onSelect: () => void;
}

export function ThreadListItem({ thread, counterpartyName, selected, onSelect }: ThreadListItemProps) {
  const t = useTranslations('messaging.inbox');
  const displayName = counterpartyName ?? t('unknownCounterparty');
  const initial = displayName.charAt(0).toUpperCase();

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
        <Avatar size="md">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
          <p className="truncate text-xs text-text-tertiary">{t('appointmentLabel', { id: thread.appointmentId.slice(0, 8) })}</p>
        </div>
        {Boolean(thread.unreadCount) && (
          <Badge variant="primary" className="shrink-0">
            {thread.unreadCount}
          </Badge>
        )}
      </button>
    </li>
  );
}
