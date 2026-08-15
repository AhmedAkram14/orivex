'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAccounts } from '@/features/admin/hooks/use-accounts';
import { useUpdateAccountRole } from '@/features/admin/hooks/use-update-account-role';
import type { Role } from '@/shared/auth/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Pagination } from '@/shared/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const ROLE_OPTIONS: Role[] = ['patient', 'doctor', 'nurse', 'receptionist', 'hospital_admin', 'super_admin'];
const PAGE_SIZE = 20;

/**
 * The Admin Users screen's account list — real data from `/admin/accounts`,
 * with an inline role-change control per row backed by
 * `PATCH /admin/accounts/:id/role`. This is the one route
 * `NAVIGATION_CONFIG`'s `nav.adminUsers` flag already pointed at before
 * this stage existed to build it.
 *
 * Phase 4 (Notification & Admin Polish): a role change is a real permission
 * grant/revocation, so it goes through the same confirm-then-give-feedback
 * shape as `AdminPaymentsTable`'s refund flow -- a `Dialog` confirmation
 * before the mutation fires, and a success `Alert` after it resolves. The
 * role filter mirrors `VerificationQueue`'s `subjectType`/`status` filter
 * pattern (an `'all'` sentinel mapped to `undefined` for the real
 * server-side `role` query param `/admin/accounts` already supports).
 */
export function AccountsTable() {
  const t = useTranslations('admin.users');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [pendingChange, setPendingChange] = useState<{ accountId: string; role: Role } | null>(null);
  const { data, isLoading, isError } = useAccounts({
    page,
    limit: PAGE_SIZE,
    role: roleFilter === 'all' ? undefined : roleFilter,
  });
  const updateRole = useUpdateAccountRole();

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value as Role | 'all');
    setPage(1);
  }

  function closeDialog() {
    setPendingChange(null);
  }

  async function handleConfirmRoleChange() {
    if (!pendingChange) return;
    await updateRole.mutateAsync(pendingChange).catch(() => {});
    closeDialog();
  }

  const roleFilterControl = (
    <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
      <SelectTrigger aria-label={t('filterRole')} className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('filterRoleAll')}</SelectItem>
        {ROLE_OPTIONS.map((role) => (
          <SelectItem key={role} value={role}>
            {t(`role.${role}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        {roleFilterControl}
        <Alert variant="danger">{t('loadError')}</Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {roleFilterControl}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {roleFilterControl}
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      {roleFilterControl}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columnName')}</TableHead>
            <TableHead>{t('columnEmail')}</TableHead>
            <TableHead>{t('columnStatus')}</TableHead>
            <TableHead>{t('columnRole')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell>{account.displayName}</TableCell>
              <TableCell>{account.email}</TableCell>
              <TableCell>
                <Badge variant={account.status === 'active' ? 'success' : 'danger'}>
                  {t(`status.${account.status}`)}
                </Badge>
              </TableCell>
              <TableCell>
                <Select
                  value={account.role}
                  onValueChange={(role) => setPendingChange({ accountId: account.id, role: role as Role })}
                  disabled={updateRole.isPending}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`role.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {updateRole.isError && <Alert variant="danger">{t('roleUpdateError')}</Alert>}
      {updateRole.isSuccess && !updateRole.isPending && pendingChange === null && (
        <Alert variant="success">{t('roleUpdateSucceeded')}</Alert>
      )}
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <Dialog open={pendingChange !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('roleChangeDialogTitle')}</DialogTitle>
            <DialogDescription>{t('roleChangeDialogDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t('cancel')}
            </Button>
            <Button loading={updateRole.isPending} onClick={handleConfirmRoleChange}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
