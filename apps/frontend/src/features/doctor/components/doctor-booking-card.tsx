'use client';

import { CalendarCheck } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useAvailabilityWindows } from '@/features/scheduling/hooks/use-availability-windows';
import { formatConsultationPrice } from '@/features/scheduling/utils/pricing';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const LOOKAHEAD_DAYS = 14;

export interface DoctorBookingCardProps {
  doctorProfileId: string;
  /** The doctor's profile fee; undefined when none is on record ("Fee on request"). */
  consultationFeeAmount?: number;
  currency?: string;
}

/**
 * The patient's booking summary for one doctor: the profile fee, the next open
 * slot (real `availability-windows`, never generated client-side) with ITS OWN
 * price -- shown next to the profile fee rather than reconciled with it, since
 * a slot can be priced differently from the profile default -- and the Book
 * button. On desktop it is a sticky card in the inline-end column; below `lg`
 * it is a bar pinned above the phone bottom nav.
 */
export function DoctorBookingCard({ doctorProfileId, consultationFeeAmount, currency = 'EGP' }: DoctorBookingCardProps) {
  const t = useTranslations('bookingCard');
  const format = useFormatter();
  const range = useMemo(() => {
    const from = new Date();
    return { from: from.toISOString(), to: new Date(from.getTime() + LOOKAHEAD_DAYS * 86_400_000).toISOString() };
  }, []);
  const { data: windows, isLoading } = useAvailabilityWindows(doctorProfileId, range.from, range.to);

  const nextSlot = (windows ?? [])
    .filter((window) => window.status === 'open' && new Date(window.startTime).getTime() > Date.now())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const feeLabel =
    consultationFeeAmount === undefined
      ? t('feeOnRequest')
      : consultationFeeAmount === 0
        ? t('free')
        : formatCurrency(format, consultationFeeAmount, currency);

  const slotWhen = nextSlot
    ? format.dateTime(new Date(nextSlot.startTime), { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    : undefined;
  const slotPrice = nextSlot ? formatConsultationPrice(nextSlot, format, t('free'), {
        amount: consultationFeeAmount,
        currency,
        label: (price) => t('normally', { price }),
      }) : undefined;

  const bookHref = `/patient/appointments/book?doctorId=${doctorProfileId}`;

  return (
    <>
      <aside
        aria-label={t('title')}
        className="hidden flex-col gap-4 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) shadow-sm @2xl:sticky @2xl:top-6 @2xl:flex"
      >
        <h2 className="text-h3 text-text-primary">{t('title')}</h2>
        <div className="flex flex-col gap-0.5">
          <span className="text-small text-text-tertiary">{t('fee')}</span>
          <span data-numeric className="font-display text-metric text-text-primary">{feeLabel}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-small text-text-tertiary">{t('nextSlot')}</span>
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : nextSlot ? (
            <>
              <span className="text-body font-medium text-text-primary">{slotWhen}</span>
              <span className="text-small text-text-secondary">{t('thisSlotPrice', { price: slotPrice ?? '' })}</span>
            </>
          ) : (
            <span className="text-small text-text-secondary">{t('noSlots')}</span>
          )}
        </div>
        <Button asChild size="lg">
          <Link href={bookHref}>
            <Icon icon={CalendarCheck} size="sm" />
            {t('bookWithDoctor')}
          </Link>
        </Button>
      </aside>

      <div className="fixed inset-x-0 bottom-14 z-(--z-sticky) flex items-center gap-3 border-t border-border-default bg-surface px-4 py-3 md:bottom-0 @2xl:hidden print-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <span data-numeric className="font-display text-h3 text-text-primary">{feeLabel}</span>
          <span className="truncate text-caption text-text-tertiary">{isLoading ? '…' : nextSlot ? `${t('nextSlot')}: ${slotWhen}` : t('noSlots')}</span>
        </div>
        <Button asChild>
          <Link href={bookHref}>{t('book')}</Link>
        </Button>
      </div>
    </>
  );
}
