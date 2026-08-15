'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Monitor } from 'lucide-react';
import { useDeviceSessions } from '@/features/auth/hooks/use-device-sessions';
import { useRevokeDeviceSession } from '@/features/auth/hooks/use-revoke-device-session';
import type { DeviceSession } from '@/features/auth/api/types';
import { Icon } from '@/shared/icons/icon';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { Alert } from '@/shared/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/use-toast';

export function DeviceSessionsList() {
  const t = useTranslations('auth.securityCenter.deviceSessions');
  const { data: sessions, isLoading, isError } = useDeviceSessions();
  const revokeSession = useRevokeDeviceSession();
  const [pendingRevoke, setPendingRevoke] = useState<DeviceSession | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (!sessions || sessions.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border-default p-4"
          >
            <div className="flex items-center gap-3">
              <Icon icon={Monitor} size="lg" className="text-text-tertiary" />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">{session.userAgent ?? t('unknownDevice')}</p>
                  {session.isCurrent && <Badge variant="success">{t('currentDeviceBadge')}</Badge>}
                </div>
                {session.ipAddress && <p className="text-sm text-text-secondary">{session.ipAddress}</p>}
                <p className="text-xs text-text-tertiary">
                  {t('lastActive', {
                    lastActiveAt: new Date(session.lastActiveAt).toLocaleString(undefined, { timeZone: 'Africa/Cairo' }),
                  })}
                </p>
              </div>
            </div>
            {!session.isCurrent && (
              <Button variant="outline" size="sm" onClick={() => setPendingRevoke(session)}>
                {t('revoke')}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={pendingRevoke !== null} onOpenChange={(open) => !open && setPendingRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('revokeConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {pendingRevoke && t('revokeConfirmDescription', { device: pendingRevoke.userAgent ?? t('unknownDevice') })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={revokeSession.isPending}
              onClick={() => {
                if (!pendingRevoke) return;
                revokeSession.mutate(pendingRevoke.id, {
                  onSuccess: () => {
                    toast({ description: t('revokeSuccess'), variant: 'success' });
                    setPendingRevoke(null);
                  },
                  onError: () => {
                    toast({ description: t('revokeError'), variant: 'danger' });
                  },
                });
              }}
            >
              {t('revoke')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
