'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';

export interface NewConversationItemProps {
  appointmentId: string;
  counterpartyName: string;
  /** ISO timestamp. */
  scheduledAt: string;
  onStart: (appointmentId: string) => void;
  starting: boolean;
}

/** One row in the "Start a conversation" picker -- an appointment with no thread yet. */
export function NewConversationItem({ appointmentId, counterpartyName, scheduledAt, onStart, starting }: NewConversationItemProps) {
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
      <Button type="button" variant="outline" size="sm" onClick={() => onStart(appointmentId)} loading={starting}>
        {t('startConversation')}
      </Button>
    </li>
  );
}
