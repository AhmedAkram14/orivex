'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useAdminPayments } from '@/features/admin/hooks/use-admin-payments';
import { useAdminRefundPayment } from '@/features/admin/hooks/use-admin-refund-payment';
import type { PaymentStatus } from '@/features/payment/api/types';
import { ApiError } from '@/shared/lib/api/client';
import { Alert } from '@/shared/ui/alert';
import { Badge, badgeVariants } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Pagination } from '@/shared/ui/pagination';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

// Same positive/neutral/negative badge convention as VerificationQueue /
// VerificationCaseDetail's STATUS_BADGE_VARIANT: success = a settled good
// outcome, danger = a terminal negative outcome, warning = still in
// progress, neutral = a resolved-but-inactive state (money already
// returned, no action pending).
const STATUS_BADGE_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  succeeded: 'success',
  settled: 'success',
  refunded: 'neutral',
  initiated: 'warning',
  failed: 'danger',
  disputed: 'danger',
};

const REFUNDABLE_STATUSES = new Set(['succeeded', 'settled']);
const PAGE_SIZE = 20;

/**
 * ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4: SuperAdmin's
 * payment transaction list + refund action, extending the Admin Analytics
 * page's previously read-only-analytics payment surface with a real
 * per-transaction list (`GET /admin/payments`) and refund
 * (`POST /admin/payments/:id/refund`, calling the same unmodified
 * `RefundPaymentUseCase` the doctor-facing flow uses). Mirrors
 * `AccountsTable`'s loading/error/empty/pagination shape and
 * `VerificationReviewActions`'s confirm-dialog pattern exactly. Refund only
 * shows for a `succeeded`/`settled` row -- a `refunded` row shows its status
 * badge with no action, never a fabricated control on a transaction that
 * can't be refunded again (the domain's own guard is the real enforcement;
 * this is just honest UI).
 */
export function AdminPaymentsTable() {
  const t = useTranslations('admin.analytics.payments');
  const [page, setPage] = useState(1);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data, isLoading, isError } = useAdminPayments({ page, limit: PAGE_SIZE });
  const refund = useAdminRefundPayment();

  if (isError) {
    return <Alert variant="danger">{t('transactionsLoadError')}</Alert>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.transactions.length === 0) {
    return <EmptyState title={t('transactionsEmptyTitle')} description={t('transactionsEmptyDescription')} />;
  }

  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  function closeDialog() {
    setConfirmingId(null);
  }

  async function handleConfirmRefund() {
    if (!confirmingId) return;
    const id = confirmingId;
    // mutateAsync's rejection is intentionally not rethrown -- the mutation's
    // own isError/error state (rendered below) is what surfaces a gateway
    // rejection to the user; re-throwing here would just become an unhandled
    // rejection since nothing above this handler awaits it.
    await refund.mutateAsync(id).catch(() => {});
    closeDialog();
  }

  return (
    <div className="flex flex-col gap-4">
      <Heading as="h2" level={4}>{t('transactionsTitle')}</Heading>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columnPatient')}</TableHead>
            <TableHead>{t('columnDoctor')}</TableHead>
            <TableHead className="text-end">{t('columnAmount')}</TableHead>
            <TableHead>{t('columnStatus')}</TableHead>
            <TableHead>{t('columnDate')}</TableHead>
            <TableHead>{t('columnAction')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.transactions.map((transaction) => {
            const refundable = REFUNDABLE_STATUSES.has(transaction.status);
            return (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.patientName}</TableCell>
                <TableCell>{transaction.doctorName}</TableCell>
                <TableCell className="text-end tabular-nums">
                  {transaction.amount.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {transaction.amount.currency}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[transaction.status]}>
                    {t(`status.${transaction.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(transaction.createdAt).toLocaleDateString(undefined, { timeZone: 'Africa/Cairo' })}</TableCell>
                <TableCell>
                  {refundable ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={refund.isPending && refund.variables === transaction.id}
                      onClick={() => setConfirmingId(transaction.id)}
                    >
                      {t('refundAction')}
                    </Button>
                  ) : (
                    <span className="text-sm text-text-tertiary">{t('noActionAvailable')}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {refund.isError && (
        <Alert variant="danger">{refund.error instanceof ApiError ? refund.error.message : t('refundFailed')}</Alert>
      )}
      {refund.isSuccess && !refund.isPending && <Alert variant="success">{t('refundSucceeded')}</Alert>}
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <Dialog open={confirmingId !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('refundDialogTitle')}</DialogTitle>
            <DialogDescription>{t('refundDialogDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t('cancel')}
            </Button>
            <Button variant="danger" loading={refund.isPending} onClick={handleConfirmRefund}>
              {t('refundAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
