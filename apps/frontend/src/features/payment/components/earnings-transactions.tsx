'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState, type MouseEvent } from 'react';
import type { DoctorEarningsTransaction, PaymentStatus } from '@/features/payment/api/types';
import { groupByMonth, rowAmounts } from '@/features/payment/lib/earnings';
import { useElementWidth } from '@/shared/hooks/use-element-width';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { cn } from '@/shared/lib/cn';
import { Alert } from '@/shared/ui/alert';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatusBadge, type StatusKey } from '@/shared/ui/status-badge';

const PAGE_SIZE = 20;
/** Below this width the rows become cards. */
const TABLE_MIN_WIDTH = 640;

/** The doctor's words for a payment's state ("Paid", not the processor's "Succeeded"), from the shared status vocabulary. */
const STATUS_KEY: Record<PaymentStatus, StatusKey> = {
  succeeded: 'paid',
  settled: 'paid',
  initiated: 'processing',
  refunded: 'refunded',
  failed: 'failed',
  disputed: 'disputed',
};

export interface EarningsTransactionsProps {
  transactions: DoctorEarningsTransaction[] | undefined;
  commissionRate: number | undefined;
  currency: string;
  loading: boolean;
  error: boolean;
}

/**
 * Every payment in the range, newest first, grouped by month under a sticky header with the month's net. Gross is
 * the payment; commission and net follow the backend's own rule (see `lib/earnings.ts`) and are blank for a payment
 * that isn't an earning (refunded, failed, still processing). The whole row opens the appointment; the patient's name
 * is its accessible link. Twenty rows at a time; cards on narrow screens.
 */
export function EarningsTransactions({
  transactions,
  commissionRate,
  currency,
  loading,
  error,
}: EarningsTransactionsProps) {
  const t = useTranslations('doctor.earnings.transactions');
  const tTable = useTranslations('doctor.earnings.table');
  const format = useFormatter();
  const router = useRouter();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const compact = width > 0 && width < TABLE_MIN_WIDTH;

  const rate = commissionRate ?? 0;
  const money = (amount: number) => formatCurrency(format, amount, currency);
  const date = (iso: string) =>
    format.dateTime(new Date(iso), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const monthLabel = (key: string) =>
    format.dateTime(new Date(`${key}-01T00:00:00Z`), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const href = (transaction: DoctorEarningsTransaction) =>
    `/doctor/appointments?highlight=${transaction.appointmentId}`;
  const open = (transaction: DoctorEarningsTransaction) => (event: MouseEvent) => {
    // The name is the row's real link; a click anywhere else on the row does the same.
    if ((event.target as HTMLElement).closest('a')) return;
    router.push(href(transaction));
  };

  const all = transactions ?? [];
  // Month nets come from the whole range; the list itself shows twenty rows at a time.
  const groups = groupByMonth(all, rate);
  const visibleIds = new Set(all.slice(0, visibleCount).map((transaction) => transaction.id));
  const status = (transaction: DoctorEarningsTransaction) => (
    <StatusBadge status={STATUS_KEY[transaction.status]} />
  );
  const blank = <span className="text-text-tertiary">—</span>;

  return (
    <WidgetContainer
      data-earnings-transactions=""
      title={<span className="text-h3">{t('title')}</span>}
      titleAs="h2"
    >
      <div ref={ref}>
        {error ? (
          <Alert variant="danger">{t('loadError')}</Alert>
        ) : loading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : all.length === 0 ? (
          <EmptyState
            illustration="records-start"
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/doctor/schedule">{t('emptyAction')}</Link>
              </Button>
            }
          />
        ) : compact ? (
          <div className="flex flex-col">
            {groups.map((group) => {
              const rows = group.rows.filter((row) => visibleIds.has(row.id));
              if (rows.length === 0) return null;
              return (
                <section key={group.key} aria-labelledby={`earn-month-${group.key}`}>
                  <h3
                    id={`earn-month-${group.key}`}
                    className="sticky top-0 z-[1] -mx-(--card-pad) bg-surface-2 px-(--card-pad) py-1.5 text-xs font-semibold text-text-secondary"
                  >
                    {t('monthHeader', { month: monthLabel(group.key), amount: money(group.net) })}
                  </h3>
                  <ul className="flex flex-col divide-y divide-border-default">
                    {rows.map((transaction) => {
                      const amounts = rowAmounts(transaction, rate);
                      return (
                        <li
                          key={transaction.id}
                          data-transaction-row=""
                          onClick={open(transaction)}
                          className="flex cursor-pointer flex-col gap-1 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <PersonAvatar name={transaction.patientName} size="xs" />
                              <div className="min-w-0">
                                <Link
                                  href={href(transaction)}
                                  className="block truncate text-sm font-medium text-text-primary hover:underline"
                                >
                                  {transaction.patientName}
                                </Link>
                                <p className="text-xs text-text-tertiary">
                                  {date(transaction.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className="text-body font-semibold text-text-primary tabular-nums">
                                {amounts.net === null ? blank : <bdi>{money(amounts.net)}</bdi>}
                              </span>
                              {status(transaction)}
                            </div>
                          </div>
                          <p className="text-xs text-text-tertiary tabular-nums">
                            {tTable('gross')} <bdi>{money(amounts.gross)}</bdi>
                            {amounts.commission !== null && (
                              <>
                                {' · '}
                                {tTable('commission')} <bdi>{money(amounts.commission)}</bdi>
                              </>
                            )}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[16%]" />
              <col />
              <col />
              <col />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border-default text-xs text-text-tertiary">
                <th scope="col" className="py-2 pe-3 text-start font-medium">
                  {tTable('patient')}
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {tTable('date')}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {tTable('gross')}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {tTable('commission')}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {tTable('net')}
                </th>
                <th scope="col" className="py-2 ps-3 text-start font-medium">
                  {tTable('status')}
                </th>
              </tr>
            </thead>
            {groups.map((group) => {
              const rows = group.rows.filter((row) => visibleIds.has(row.id));
              if (rows.length === 0) return null;
              return (
                <tbody key={group.key}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={6}
                      className="sticky top-0 z-[1] bg-surface-2 px-3 py-1.5 text-start text-xs font-semibold text-text-secondary"
                    >
                      {t('monthHeader', { month: monthLabel(group.key), amount: money(group.net) })}
                    </th>
                  </tr>
                  {rows.map((transaction) => {
                    const amounts = rowAmounts(transaction, rate);
                    return (
                      <tr
                        key={transaction.id}
                        data-transaction-row=""
                        onClick={open(transaction)}
                        className="cursor-pointer border-b border-border-default transition-colors duration-(--duration-fast) last:border-b-0 hover:bg-surface-2"
                      >
                        <td className="py-2.5 pe-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <PersonAvatar name={transaction.patientName} size="xs" />
                            <Link
                              href={href(transaction)}
                              className="truncate font-medium text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                            >
                              {transaction.patientName}
                            </Link>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-text-secondary">
                          {date(transaction.createdAt)}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-end tabular-nums',
                            amounts.net === null ? 'text-text-tertiary' : 'text-text-secondary',
                          )}
                        >
                          <bdi>{money(amounts.gross)}</bdi>
                        </td>
                        <td className="px-3 py-2.5 text-end tabular-nums text-text-secondary">
                          {amounts.commission === null ? (
                            blank
                          ) : (
                            <bdi>{money(amounts.commission)}</bdi>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-end font-medium tabular-nums text-text-primary">
                          {amounts.net === null ? blank : <bdi>{money(amounts.net)}</bdi>}
                        </td>
                        <td className="py-2.5 ps-3">{status(transaction)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        )}

        {!loading && !error && all.length > visibleCount && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              {t('showMore', {
                count: Math.min(PAGE_SIZE, all.length - visibleCount),
                total: all.length - visibleCount,
              })}
            </Button>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}
