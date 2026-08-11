import type { ReactNode } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { StatusBadge, type ScheduleStatusTone } from '@/shared/ui/schedule/status-badge';

export type BookingSummaryStatus = Extract<ScheduleStatusTone, 'pending' | 'confirmed' | 'cancelled'>;

export interface BookingSummaryCardProps {
  /** Pre-formatted, localized date text (e.g. "Mon, Jul 20, 2026"). */
  dateLabel: string;
  /** Pre-formatted, localized time text (e.g. "9:00 AM – 9:30 AM"). */
  timeLabel: string;
  durationLabel: string;
  timezoneLabel: string;
  status: BookingSummaryStatus;
  statusLabel: ReactNode;
  /** Consultation Pricing Redesign: e.g. "Paid consultation" — omitted entirely when the caller has no consultation-type fact to show. */
  consultationTypeLabel?: ReactNode;
  /** Consultation Pricing Redesign: e.g. "Total" — the caption for `priceLabel`. Required whenever `priceLabel` is passed. */
  totalCaption?: ReactNode;
  /** Consultation Pricing Redesign: the real backend-supplied price for this booking, pre-formatted (e.g. "FREE" or "500 EGP") — never computed here. */
  priceLabel?: ReactNode;
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
  consultationTypeLabel,
  totalCaption,
  priceLabel,
  actions,
}: BookingSummaryCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-text-primary">{dateLabel}</p>
          <StatusBadge tone={status} label={statusLabel} />
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
          {consultationTypeLabel && (
            <div className="flex items-center justify-between">
              <dt className="text-text-tertiary">{consultationTypeLabel}</dt>
            </div>
          )}
          {priceLabel && (
            <div className="flex items-center justify-between border-t border-border-default pt-2">
              <dt className="font-medium text-text-primary">{totalCaption}</dt>
              <dd className="font-semibold text-text-primary">{priceLabel}</dd>
            </div>
          )}
        </dl>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
