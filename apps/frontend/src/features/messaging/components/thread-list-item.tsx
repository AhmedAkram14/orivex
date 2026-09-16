'use client';

import { useTranslations } from 'next-intl';
import type { MessageThread } from '@/features/messaging/api/types';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { cn } from '@/shared/lib/cn';

export interface ThreadListItemProps {
  thread: MessageThread;
  selected: boolean;
  onSelect: () => void;
}

// Re-threading (Phase 1): `counterpartyDisplayName` now comes resolved
// server-side on the thread itself -- the old client-side id-matching
// against the caller's own appointments list, and the per-appointment
// label line (no `appointmentId` exists anymore), are both gone. Phase 3
// still owns the rest of this row's redesign (relative `lastMessageAt`
// secondary line, merged-list sorting, aria-hidden avatar initial); this is
// only the minimum change to keep this component compiling and honest
// against the new DTO shape.
export function ThreadListItem({ thread, selected, onSelect }: ThreadListItemProps) {
  const t = useTranslations('messaging.inbox');
  const displayName = thread.counterpartyDisplayName ?? t('unknownCounterparty');
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
        </div>
      </button>
    </li>
  );
}
