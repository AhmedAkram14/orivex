'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';

export interface NewConversationItemProps {
  /** Re-threading (Phase 1): the counterparty's own profile id, not an appointment id -- see MessagingWorkspace's own doc-comment for a known gap on the doctor side. */
  counterpartyProfileId: string;
  counterpartyName: string;
  /** ISO timestamp. */
  scheduledAt: string;
  onStart: (counterpartyProfileId: string) => void;
  starting: boolean;
}

/** One row in the "Start a conversation" picker -- an appointment whose counterparty has no thread yet. */
export function NewConversationItem({ counterpartyProfileId, counterpartyName, scheduledAt, onStart, starting }: NewConversationItemProps) {
  const t = useTranslations('messaging.inbox');
  const format = useFormatter();

  return (
    <li className="flex items-center gap-3 rounded-md px-3 py-2.5">
      <Avatar size="md">
        <AvatarFallback>{counterpartyName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{counterpartyName}</p>
        <p className="truncate text-xs text-text-tertiary">
          {format.dateTime(new Date(scheduledAt), { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onStart(counterpartyProfileId)} loading={starting}>
        {t('startConversation')}
      </Button>
    </li>
  );
}
