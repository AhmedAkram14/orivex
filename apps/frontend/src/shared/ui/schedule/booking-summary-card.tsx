import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';

export type BookingSummaryStatus = 'pending' | 'confirmed' | 'cancelled';

const badgeVariantByStatus: Record<BookingSummaryStatus, 'neutral' | 'success' | 'danger'> = {
  pending: 'neutral',
  confirmed: 'success',
  cancelled: 'danger',
};

export interface BookingSummaryCardProps {
  /** Pre-formatted, localized date text (e.g. "Mon, Jul 20, 2026"). */
  dateLabel: string;
  /** Pre-formatted, localized time text (e.g. "9:00 AM – 9:30 AM"). */
  timeLabel: string;
  durationLabel: string;
  timezoneLabel: string;
  status: BookingSummaryStatus;
  statusLabel: ReactNode;
  actions?: ReactNode;
}

/**
 * The Booking Architecture's summary/confirmation surface (Milestone 4) —
 * one consistent card for the review-before-confirming step, the
 * just-booked confirmation, and (via `status`/`actions`) the
 * cancellation/reschedule entry points off an existing booking. Never
 * renders a fabricated confirmation number or reference id — none exists
 * without a real backend, so this component doesn't invent one.
 */
export function BookingSummaryCard({
  dateLabel,
  timeLabel,
  durationLabel,
  timezoneLabel,
  status,
  statusLabel,
  actions,
}: BookingSummaryCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-text-primary">{dateLabel}</p>
          <Badge variant={badgeVariantByStatus[status]}>{statusLabel}</Badge>
        </div>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-text-tertiary">{timeLabel}</dt>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-tertiary">{durationLabel}</dt>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-tertiary">{timezoneLabel}</dt>
          </div>
        </dl>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
