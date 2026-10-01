'use client';

import { MoreVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorQueue } from '@/features/doctor/hooks/use-doctor-queue';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { QueueStatus, type QueueStatusValue } from '@/shared/ui/queue/queue-status';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

/** Three rows like the Overview's other lists, so the row's cards end level; "View Full Queue" has the rest. */
const MAX_ENTRIES = 3;

/**
 * The redesigned Overview page's compact Patient Queue widget — the same
 * real `useDoctorQueue()` source the full `/doctor/queue` page renders, top
 * few entries only, with a "View Full Queue" link to the real page rather
 * than duplicating its full interactive queue architecture here.
 */
export function PatientQueueMini() {
  const t = useTranslations('doctor.dashboard');
  const tStatus = useTranslations('doctor.queue.status');
  const { data: queue, isLoading, isError } = useDoctorQueue();

  const entries = (queue ?? []).slice(0, MAX_ENTRIES);

  return (
    <WidgetContainer
      title={<span className="text-xl font-semibold">{t('patientQueueMini.title')}</span>}
      className="rounded-(--r-card) border-border-default shadow-sm"
      // In a row stretched to its neighbour's height, an empty queue's one line sits in the middle, not at the top.
      data-empty={!isLoading && !isError && entries.length === 0 ? '' : undefined}
      contentClassName={!isLoading && !isError && entries.length === 0 ? 'flex flex-col justify-center' : undefined}
      footer={
        <Button asChild variant="ghost" size="sm">
          <Link href="/doctor/queue">{t('patientQueueMini.viewFullQueue')}</Link>
        </Button>
      }
    >
      {isError ? (
        <Alert variant="danger">{t('patientQueueMini.loadError')}</Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : entries.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-xl p-3 -mx-3 transition-colors duration-(--duration-fast) hover:bg-secondary-subtle"
            >
              {/* 14px name + 12px wait: sm. */}
              <PersonAvatar name={entry.label} src={entry.avatarUrl} size="sm" />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-text-primary">{entry.label}</span>
                {entry.estimatedWaitMinutes != null && (
                  <span className="text-xs text-text-tertiary">
                    {t('patientQueueMini.waitingMinutes', { minutes: entry.estimatedWaitMinutes })}
                  </span>
                )}
              </div>
              <QueueStatus status={entry.status as QueueStatusValue} label={tStatus(entry.status as QueueStatusValue)} />
              <button
                type="button"
                aria-label={t('patientQueueMini.moreOptions')}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors duration-(--duration-fast) hover:bg-secondary-subtle hover:text-text-secondary"
              >
                <Icon icon={MoreVertical} size="sm" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        // One quiet line: the greeting's day strip is the Overview's one illustrated empty state.
        <p className="text-sm text-text-secondary">{t('patientQueueMini.emptyLine')}</p>
      )}
    </WidgetContainer>
  );
}
