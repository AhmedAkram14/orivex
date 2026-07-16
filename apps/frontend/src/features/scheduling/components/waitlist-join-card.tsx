'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useJoinWaitlist } from '@/features/scheduling/hooks/use-join-waitlist';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

export interface WaitlistJoinCardProps {
  /** ISO date (no time) — the date with no available slots. */
  date: string;
}

/**
 * The waiting-list architecture (Milestone 4) — offered whenever a chosen
 * date has no available slots, backed by a real (mocked) POST
 * `/scheduling/waitlist`. Once joined, shows a real confirmation, never a
 * fabricated queue position (no real backend exists to compute one).
 */
export function WaitlistJoinCard({ date }: WaitlistJoinCardProps) {
  const t = useTranslations('scheduling.waitlist');
  const joinWaitlist = useJoinWaitlist();
  const [joined, setJoined] = useState(false);

  if (joined) {
    return <EmptyState title={t('joinedTitle')} description={t('joinedDescription')} />;
  }

  return (
    <EmptyState
      title={t('emptyTitle')}
      description={t('emptyDescription')}
      action={
        <div className="flex flex-col items-center gap-2">
          {joinWaitlist.error instanceof ApiError && (
            <Alert variant="danger" role="alert">
              {joinWaitlist.error.message}
            </Alert>
          )}
          <Button
            loading={joinWaitlist.isPending}
            onClick={() => joinWaitlist.mutate({ date }, { onSuccess: () => setJoined(true) })}
          >
            {t('join')}
          </Button>
        </div>
      }
    />
  );
}
