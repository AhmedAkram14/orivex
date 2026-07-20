'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useReviewVerificationCase } from '@/features/admin/hooks/use-review-verification-case';
import { useVerificationQueue } from '@/features/admin/hooks/use-verification-queue';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

/**
 * The doctor-verification review queue's first-ever frontend surface --
 * `GetVerificationReviewQueueUseCase`/`ReviewVerificationCaseUseCase`
 * existed on the backend since before this stage but were never wired to a
 * route (`administration.module.ts`'s own pre-Stage-4 comment: "no
 * controllers"). Now backed by real `GET`/`PATCH /admin/verification-queue`
 * endpoints.
 */
export function VerificationQueue() {
  const t = useTranslations('admin.verificationQueue');
  const format = useFormatter();
  const { data: cases, isLoading, isError } = useVerificationQueue();
  const review = useReviewVerificationCase();

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!cases || cases.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columnDoctor')}</TableHead>
            <TableHead>{t('columnStatus')}</TableHead>
            <TableHead>{t('columnSubmitted')}</TableHead>
            <TableHead>{t('columnActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((verificationCase) => (
            <TableRow key={verificationCase.id}>
              <TableCell>{verificationCase.doctorId}</TableCell>
              <TableCell>
                <Badge variant="warning">{t(`status.${verificationCase.status}`)}</Badge>
              </TableCell>
              <TableCell>
                {format.dateTime(new Date(verificationCase.submittedAt), {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={review.isPending}
                    onClick={() => review.mutate({ id: verificationCase.id, request: { status: 'approved' } })}
                  >
                    {t('approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={review.isPending}
                    onClick={() => review.mutate({ id: verificationCase.id, request: { status: 'rejected' } })}
                  >
                    {t('reject')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {review.isError && <Alert variant="danger">{t('reviewError')}</Alert>}
    </div>
  );
}
