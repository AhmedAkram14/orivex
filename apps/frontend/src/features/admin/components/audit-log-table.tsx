'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import type { AuditLogEntry } from '@/features/admin/api/types';
import { useAuditLog } from '@/features/admin/hooks/use-audit-log';
import { useAccountById } from '@/features/identity/hooks/use-account-by-id';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Pagination } from '@/shared/ui/pagination';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const PAGE_SIZE = 25;

/** A record id is for matching, not reading: its first 8 characters, the full id on hover and to assistive tech. */
function ShortId({ id }: { id: string }) {
  return (
    <span dir="ltr" title={id} aria-label={id} className="font-mono text-xs text-text-tertiary">
      {id.slice(0, 8)}…
    </span>
  );
}

/**
 * "snake_case" -> "Snake case": the readable fallback for a code that has no translation yet (an action or subject
 * type added on the backend after this list), so a new code still reads as words rather than an identifier.
 */
function humanize(code: string): string {
  const words = code.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The actor's name, resolved through the same `GET /accounts/:id` the verification queue uses (one request per
 * distinct actor, cached), with their role beneath; the short id stays as the fallback and for matching.
 */
function ActorCell({ entry }: { entry: AuditLogEntry }) {
  const t = useTranslations('admin.auditLog');
  const tRole = useTranslations('admin.users.role');
  const { data: account, isLoading } = useAccountById(entry.actorAccountId);
  const role = tRole.has(entry.actorRole) ? tRole(entry.actorRole) : humanize(entry.actorRole);

  return (
    <div className="flex min-w-36 flex-col gap-0.5">
      {isLoading ? (
        <Skeleton className="h-4 w-28" />
      ) : account ? (
        <span dir="auto" className="text-start font-medium text-text-primary">
          {account.displayName}
        </span>
      ) : (
        <span className="text-text-secondary">{t('unknownActor')}</span>
      )}
      <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-text-tertiary">
        <span>{role}</span>
        <ShortId id={entry.actorAccountId} />
      </span>
    </div>
  );
}

/**
 * I11 -- Admin audit-log viewer (ORIVEX Remaining Work Audit): the real,
 * cross-account read side of C2's write-only audit trail
 * (`GET /admin/audit-log`) -- searchable by actor account and subject type.
 * Actions and subject types read as words (translated, with a humanized
 * fallback), actors by name, ids shortened; a reason, when one was given,
 * sits under its action instead of an always-empty column. The page header
 * already carries the title and description.
 */
export function AuditLogTable() {
  const t = useTranslations('admin.auditLog');
  const format = useFormatter();
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
  const actionLabel = (action: string) => (t.has(`actions.${action}`) ? t(`actions.${action}`) : humanize(action));
  const subjectLabel = (type: string) => (t.has(`subjects.${type}`) ? t(`subjects.${type}`) : humanize(type));

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
        <EmptyState illustration="inbox-quiet" title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columnWhen')}</TableHead>
                <TableHead>{t('columnActor')}</TableHead>
                <TableHead>{t('columnAction')}</TableHead>
                <TableHead>{t('columnSubject')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap align-top tabular-nums text-text-secondary">
                    {format.dateTime(new Date(entry.createdAt), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' })}
                  </TableCell>
                  <TableCell className="align-top">
                    <ActorCell entry={entry} />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex min-w-44 flex-col items-start gap-1">
                      <Badge variant="neutral" className="whitespace-nowrap">
                        {actionLabel(entry.action)}
                      </Badge>
                      {entry.reason && (
                        <p className="text-xs text-text-secondary">
                          <span className="text-text-tertiary">{t('reasonLabel')} </span>
                          <bdi>{entry.reason}</bdi>
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-0.5 whitespace-nowrap">
                      <span>{subjectLabel(entry.subjectType)}</span>
                      <ShortId id={entry.subjectId} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
