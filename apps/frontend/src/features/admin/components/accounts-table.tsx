'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAccounts } from '@/features/admin/hooks/use-accounts';
import { useUpdateAccountRole } from '@/features/admin/hooks/use-update-account-role';
import type { Role } from '@/shared/auth/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
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
 */
export function AccountsTable() {
  const t = useTranslations('admin.users');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAccounts({ page, limit: PAGE_SIZE });
  const updateRole = useUpdateAccountRole();

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
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

  if (!data || data.accounts.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
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
                  onValueChange={(role) => updateRole.mutate({ accountId: account.id, role: role as Role })}
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
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
