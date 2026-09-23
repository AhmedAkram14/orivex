'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { useState } from 'react';
import { useLoginHistory } from '@/features/auth/hooks/use-login-history';
import type { LoginFailureReason, LoginHistoryOutcome, LoginHistoryOutcomeFilter } from '@/features/auth/api/types';
import { formatLocation } from '@/features/auth/lib/format-device-location';
import { LoginHistoryDateRangePicker } from '@/features/auth/components/login-history-date-range-picker';
import { formatDateTime } from '@/shared/lib/date/format-datetime';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { Alert } from '@/shared/ui/alert';
import { FilterTabs } from '@/shared/ui/filter-tabs';
import { Pagination } from '@/shared/ui/pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

const badgeVariantByOutcome: Record<LoginHistoryOutcome, 'success' | 'danger' | 'warning'> = {
  success: 'success',
  failed: 'danger',
  locked: 'warning',
};

export function LoginHistoryTable() {
  const t = useTranslations('auth.securityCenter.loginHistory');
  const format = useFormatter();
  const [outcome, setOutcome] = useState<LoginHistoryOutcomeFilter>('all');
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const { data, isLoading, isError } = useLoginHistory({ page, limit: 20, outcome, from, to });

  function handleOutcomeChange(next: LoginHistoryOutcomeFilter) {
    setOutcome(next);
    setPage(1);
  }

  function handleDateRangeChange(nextFrom: string | undefined, nextTo: string | undefined) {
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  }

  function reasonLabel(reason: LoginFailureReason | undefined): string | undefined {
    return reason ? t(`reason.${reason}`) : undefined;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <FilterTabs
            value={outcome}
            onChange={handleOutcomeChange}
            options={[
              { value: 'all', label: t('filter.all') },
              { value: 'success', label: t('filter.success') },
              { value: 'failed', label: t('filter.failed') },
            ]}
          />
          <LoginHistoryDateRangePicker from={from} to={to} onChange={handleDateRangeChange} />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="danger">{t('loadError')}</Alert>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyPeriodDescription')} />
        ) : (
          <>
            {/* Desktop/tablet: a real table. Below 640px: stacked cards (no horizontal scroll) -- the same row data, just laid out differently. */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columnTime')}</TableHead>
                  <TableHead>{t('columnUserAgent')}</TableHead>
                  <TableHead>{t('columnOutcome')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((entry) => {
                  const timestamp = new Date(entry.timestamp);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span dir="ltr" className="inline-block">
                              {formatDateTime(format, timestamp)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{format.dateTime(timestamp, { dateStyle: 'full', timeStyle: 'medium' })}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-text-primary">{entry.displayName}</span>
                          <span className="text-xs text-text-tertiary">
                            {formatLocation(entry.city, entry.country, t('unknownLocation'))}
                            {entry.ipAddress && (
                              <>
                                {' · '}
                                <bdi dir="ltr">{entry.ipAddress}</bdi>
                              </>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.reason ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Badge variant={badgeVariantByOutcome[entry.outcome]}>{t(`outcome.${entry.outcome}`)}</Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{reasonLabel(entry.reason)}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant={badgeVariantByOutcome[entry.outcome]}>{t(`outcome.${entry.outcome}`)}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <ul className="flex flex-col gap-3 sm:hidden">
              {data.items.map((entry) => {
                const timestamp = new Date(entry.timestamp);
                return (
                  <Card key={entry.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-text-primary">{entry.displayName}</span>
                      <Badge variant={badgeVariantByOutcome[entry.outcome]}>{t(`outcome.${entry.outcome}`)}</Badge>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {formatLocation(entry.city, entry.country, t('unknownLocation'))}
                      {entry.ipAddress && (
                        <>
                          {' · '}
                          <bdi dir="ltr">{entry.ipAddress}</bdi>
                        </>
                      )}
                    </span>
                    <span dir="ltr" className="self-start text-xs text-text-tertiary">
                      {formatDateTime(format, timestamp)}
                    </span>
                    {entry.reason && <span className="text-xs text-text-secondary">{reasonLabel(entry.reason)}</span>}
                  </Card>
                );
              })}
            </ul>

            {data.pageCount > 1 && <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} />}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
