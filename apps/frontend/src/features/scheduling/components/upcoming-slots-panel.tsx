'use client';

import { useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { CalendarClock } from 'lucide-react';
import { useUpcomingSlots } from '@/features/scheduling/hooks/use-upcoming-slots';
import { SlotPricingDialog } from '@/features/scheduling/components/slot-pricing-dialog';
import type { AvailabilityWindowData } from '@/features/scheduling/types';
import { formatConsultationPrice } from '@/features/scheduling/utils/pricing';
import { isSameDay } from '@/shared/lib/date/week';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatusBadge, type ScheduleStatusTone } from '@/shared/ui/schedule/status-badge';

const toneByWindowStatus: Record<AvailabilityWindowData['status'], ScheduleStatusTone> = {
  open: 'available',
  held: 'pending',
  booked: 'booked',
};

/** Groups already-sorted windows by local calendar date, preserving order. */
function groupByDate(windows: AvailabilityWindowData[]): { dateKey: string; windows: AvailabilityWindowData[] }[] {
  const groups: { dateKey: string; windows: AvailabilityWindowData[] }[] = [];
  for (const window of windows) {
    const dateKey = new Date(window.startTime).toDateString();
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.dateKey === dateKey) {
      lastGroup.windows.push(window);
    } else {
      groups.push({ dateKey, windows: [window] });
    }
  }
  return groups;
}

/**
 * Consultation Pricing Redesign: the doctor's "Upcoming Slots" management
 * list -- every generated, not-yet-booked `AvailabilityWindow` for the next
 * 60 days (`GET /scheduling/upcoming-slots`), grouped by date. Only an
 * `open` slot can be repriced; `held`/`booked` slots render as locked (no
 * edit action at all -- never just disabled, so there's no affordance to
 * click in the first place for a slot whose financial meaning must not
 * change).
 */
export function UpcomingSlotsPanel() {
  const t = useTranslations('doctor.schedule.upcomingSlots');
  const format = useFormatter();
  const locale = useLocale();
  const today = new Date();
  const { data: windows, isLoading, isError } = useUpcomingSlots();
  const [editingWindow, setEditingWindow] = useState<AvailabilityWindowData | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const sorted = [...(windows ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (sorted.length === 0) {
    return <EmptyState icon={CalendarClock} title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  const groups = groupByDate(sorted);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const groupDate = new Date(group.windows[0].startTime);
        return (
          <div key={group.dateKey} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text-primary">
              {isSameDay(groupDate, today)
                ? t('today')
                : format.dateTime(groupDate, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <ul className="flex flex-col gap-2">
              {group.windows.map((window) => {
                const timeLabel = `${format.dateTime(new Date(window.startTime), { hour: 'numeric', minute: 'numeric' })} – ${format.dateTime(new Date(window.endTime), { hour: 'numeric', minute: 'numeric' })}`;
                const priceLabel = formatConsultationPrice(window, locale, t('free'));

                return (
                  <li
                    key={window.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default p-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-text-primary">{timeLabel}</span>
                      <span className="text-sm text-text-secondary">{priceLabel}</span>
                      <StatusBadge tone={toneByWindowStatus[window.status]} label={t(`status.${window.status}`)} />
                    </div>
                    {window.status === 'open' && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingWindow(window)}>
                        {t('edit')}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {editingWindow && (
        <SlotPricingDialog
          window={editingWindow}
          timeLabel={format.dateTime(new Date(editingWindow.startTime), { hour: 'numeric', minute: 'numeric' })}
          open={Boolean(editingWindow)}
          onOpenChange={(open) => {
            if (!open) setEditingWindow(null);
          }}
        />
      )}
    </div>
  );
}
