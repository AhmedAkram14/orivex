'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useAuditLog } from '@/features/admin/hooks/use-audit-log';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Pagination } from '@/shared/ui/pagination';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const PAGE_SIZE = 25;

/**
 * I11 -- Admin audit-log viewer (ORIVEX Remaining Work Audit): the real,
 * cross-account read side of C2's write-only audit trail
 * (`GET /admin/audit-log`) -- searchable by actor account, subject, and
 * action, matching `AdminPaymentsTable`'s loading/error/empty/pagination
 * shape exactly. `action` renders through the same `messaging`-style
 * per-key translation lookup as everywhere else in this codebase rather
 * than a raw enum string.
 */
export function AuditLogTable() {
  const t = useTranslations('admin.auditLog');
  const [page, setPage] = useState(1);
  const [actorAccountId, setActorAccountId] = useState('');
  const [subjectType, setSubjectType] = useState('');

  const { data, isLoading, isError } = useAuditLog({
    page,
    limit: PAGE_SIZE,
    actorAccountId: actorAccountId.trim() || undefined,
    subjectType: subjectType.trim() || undefined,
  });

  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function handleActorFilterChange(value: string) {
    setActorAccountId(value);
    setPage(1);
  }

  function handleSubjectFilterChange(value: string) {
    setSubjectType(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <Heading as="h2" level={4}>
        {t('title')}
      </Heading>
      <p className="text-sm text-text-secondary">{t('description')}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={actorAccountId}
          onChange={(event) => handleActorFilterChange(event.target.value)}
          placeholder={t('filterActorPlaceholder')}
          aria-label={t('filterActorPlaceholder')}
        />
        <Input
          value={subjectType}
          onChange={(event) => handleSubjectFilterChange(event.target.value)}
          placeholder={t('filterSubjectPlaceholder')}
          aria-label={t('filterSubjectPlaceholder')}
        />
      </div>

      {isError && <Alert variant="danger">{t('loadError')}</Alert>}

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.entries.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columnWhen')}</TableHead>
                  <TableHead>{t('columnActor')}</TableHead>
                  <TableHead>{t('columnAction')}</TableHead>
                  <TableHead>{t('columnSubject')}</TableHead>
                  <TableHead>{t('columnReason')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {new Date(entry.createdAt).toLocaleString(undefined, { timeZone: 'Africa/Cairo' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{entry.actorAccountId}</span>
                        <span className="text-xs text-text-tertiary">{entry.actorRole}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{entry.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{entry.subjectType}</span>
                        <span className="font-mono text-xs text-text-tertiary">{entry.subjectId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">{entry.reason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
