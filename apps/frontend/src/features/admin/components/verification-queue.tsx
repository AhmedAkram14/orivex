'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAccountById } from '@/features/identity/hooks/use-account-by-id';
import { useVerificationQueue } from '@/features/admin/hooks/use-verification-queue';
import type { VerificationCase, VerificationCaseStatus, VerificationSubjectType } from '@/features/admin/api/types';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Badge, badgeVariants } from '@/shared/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const STATUS_BADGE_VARIANT: Record<VerificationCaseStatus, BadgeVariant> = {
  submitted: 'warning',
  under_review: 'warning',
  more_info_needed: 'warning',
  approved: 'success',
  rejected: 'danger',
  re_verification_due: 'info',
  suspended: 'neutral',
};

const STATUS_OPTIONS: VerificationCaseStatus[] = [
  'submitted',
  'under_review',
  'more_info_needed',
  'approved',
  'rejected',
  'suspended',
  're_verification_due',
];

function ApplicantCell({ accountId }: { accountId: string }) {
  const { data: account, isLoading } = useAccountById(accountId);
  if (isLoading) return <Skeleton className="h-4 w-32" />;
  return <span>{account?.displayName ?? accountId}</span>;
}

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
 * admin verification workspace -- real server-side subjectType/status
 * filters (never filtered client-side), real applicant identity (resolved
 * via the real `GET /accounts/:id`), and a real case-detail page per row
 * rather than cramming approve/reject into a table cell. Replaces the
 * pre-O.2 table that rendered a stale, never-populated `doctorId` field.
 */
export function VerificationQueue() {
  const t = useTranslations('admin.verificationQueue');
  const format = useFormatter();
  const [subjectType, setSubjectType] = useState<VerificationSubjectType | 'all'>('all');
  const [status, setStatus] = useState<VerificationCaseStatus | 'pending'>('pending');

  const { data: cases, isLoading, isError } = useVerificationQueue({
    subjectType: subjectType === 'all' ? undefined : subjectType,
    status: status === 'pending' ? undefined : status,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={subjectType} onValueChange={(value) => setSubjectType(value as VerificationSubjectType | 'all')}>
          <SelectTrigger aria-label={t('filterSubjectType')} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('subjectTypeAll')}</SelectItem>
            <SelectItem value="doctor">{t('subjectTypeDoctor')}</SelectItem>
            <SelectItem value="patient">{t('subjectTypePatient')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => setStatus(value as VerificationCaseStatus | 'pending')}>
          <SelectTrigger aria-label={t('filterStatus')} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t('statusPendingReview')}</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`status.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && <Alert variant="danger">{t('loadError')}</Alert>}

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && !isError && (!cases || cases.length === 0) && (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      )}

      {!isLoading && !isError && cases && cases.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnApplicant')}</TableHead>
              <TableHead>{t('columnType')}</TableHead>
              <TableHead>{t('columnStatus')}</TableHead>
              <TableHead>{t('columnSubmitted')}</TableHead>
              <TableHead>{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((verificationCase: VerificationCase) => (
              <TableRow key={verificationCase.id}>
                <TableCell>
                  <ApplicantCell accountId={verificationCase.subjectAccountId} />
                </TableCell>
                <TableCell>{t(`subjectType${verificationCase.subjectType === 'doctor' ? 'Doctor' : 'Patient'}`)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[verificationCase.status]}>{t(`status.${verificationCase.status}`)}</Badge>
                </TableCell>
                <TableCell>
                  {format.dateTime(new Date(verificationCase.submittedAt), {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/verification-queue/${verificationCase.id}`}>{t('viewCase')}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
