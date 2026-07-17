'use client';

import { useTranslations } from 'next-intl';
import { useLoginHistory } from '@/features/auth/hooks/use-login-history';
import type { LoginHistoryOutcome } from '@/features/auth/api/types';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { Alert } from '@/shared/ui/alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui/table';

const badgeVariantByOutcome: Record<LoginHistoryOutcome, 'success' | 'danger' | 'warning'> = {
  success: 'success',
  failed: 'danger',
  locked: 'warning',
};

export function LoginHistoryTable() {
  const t = useTranslations('auth.securityCenter.loginHistory');
  const { data: entries, isLoading, isError } = useLoginHistory();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (!entries || entries.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('columnTime')}</TableHead>
          <TableHead>{t('columnUserAgent')}</TableHead>
          <TableHead>{t('columnIpAddress')}</TableHead>
          <TableHead>{t('columnOutcome')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
            <TableCell>{entry.userAgent ?? t('unknownDevice')}</TableCell>
            <TableCell>{entry.ipAddress ?? '—'}</TableCell>
            <TableCell>
              <Badge variant={badgeVariantByOutcome[entry.outcome]}>{t(`outcome.${entry.outcome}`)}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
