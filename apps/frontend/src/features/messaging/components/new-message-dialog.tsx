'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { NewConversationItem } from '@/features/messaging/components/new-conversation-item';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';

export interface NewMessageCandidate {
  /** A real counterparty PROFILE id -- see `MessagingWorkspace`'s own doc-comment for how the doctor-side gap this depends on was resolved. */
  counterpartyProfileId: string;
  counterpartyName: string;
  /** ISO timestamp -- the most recent appointment with this counterparty, for display only. */
  scheduledAt: string;
}

export interface NewMessageDialogProps {
  /** Already deduplicated per counterparty -- one row per patient/doctor, never one per historical appointment. */
  candidates: NewMessageCandidate[];
  onStart: (counterpartyProfileId: string) => Promise<void> | void;
  starting: boolean;
  startingCounterpartyProfileId?: string;
}

/**
 * Messages Page Overhaul (Phase 3): replaces the old permanent "Start a
 * conversation" card with a dialog opened from the merged inbox's "New
 * message" button. Candidates are the same eligibility source as before
 * (each role's own appointments data, filtered to counterparties without an
 * existing thread) -- only the identity/dedup shape changed, not the
 * eligibility rule itself (decision 2 of the plan).
 */
export function NewMessageDialog({ candidates, onStart, starting, startingCounterpartyProfileId }: NewMessageDialogProps) {
  const t = useTranslations('messaging.inbox');
  const [open, setOpen] = useState(false);

  async function handleStart(counterpartyProfileId: string) {
    await onStart(counterpartyProfileId);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Icon icon={Plus} size="sm" />
          {t('newMessage')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('newConversationTitle')}</DialogTitle>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="px-1 text-sm text-text-secondary">{t('noNewMessageCandidates')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {candidates.map((candidate) => (
              <NewConversationItem
                key={candidate.counterpartyProfileId}
                counterpartyProfileId={candidate.counterpartyProfileId}
                counterpartyName={candidate.counterpartyName}
                scheduledAt={candidate.scheduledAt}
                onStart={handleStart}
                starting={starting && startingCounterpartyProfileId === candidate.counterpartyProfileId}
              />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
