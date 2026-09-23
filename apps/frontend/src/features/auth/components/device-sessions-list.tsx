'use client';

import { useState } from 'react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useDeviceSessions } from '@/features/auth/hooks/use-device-sessions';
import { useRevokeDeviceSession } from '@/features/auth/hooks/use-revoke-device-session';
import type { DeviceSession } from '@/features/auth/api/types';
import { formatLocation } from '@/features/auth/lib/format-device-location';
import { formatExactDateTime } from '@/shared/lib/date/format-datetime';
import { formatRelativeTime } from '@/shared/lib/date/relative-time';
import { Icon } from '@/shared/icons/icon';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { Alert } from '@/shared/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/shared/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { toast } from '@/shared/ui/use-toast';
import { cn } from '@/shared/lib/cn';

function deviceIcon(deviceType: string | undefined) {
  if (deviceType === 'mobile') return Smartphone;
  if (deviceType === 'tablet') return Tablet;
  return Monitor;
}

/** Current session first, then everything else in whatever order the backend returned (already lastActiveAt-ordered). */
function sortSessions(sessions: DeviceSession[]): DeviceSession[] {
  return [...sessions].sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));
}

export function DeviceSessionsList() {
  const t = useTranslations('auth.securityCenter.deviceSessions');
  const locale = useLocale();
  const format = useFormatter();
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

  const sorted = sortSessions(sessions);

  return (
    <TooltipProvider>
      <ul className="flex flex-col gap-3">
        {sorted.map((session) => {
          const lastActive = new Date(session.lastActiveAt);
          return (
            <li
              key={session.id}
              className={cn(
                'flex flex-col gap-3 rounded-lg border border-border-default p-4 sm:flex-row sm:items-start sm:justify-between',
                session.isCurrent && 'bg-primary-subtle',
              )}
            >
              <div className="flex items-start gap-3">
                <Icon icon={deviceIcon(session.deviceType)} size="lg" className="mt-0.5 shrink-0 text-text-tertiary" />
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{session.displayName}</p>
                    {session.isCurrent && <Badge variant="primary">{t('currentDeviceBadge')}</Badge>}
                    {session.isUnrecognizedClient && <Badge variant="warning">{t('unrecognizedClientBadge')}</Badge>}
                  </div>
                  <p className="text-sm text-text-secondary">
                    {formatLocation(session.city, session.country, t('unknownLocation'))}
                    {session.ipAddress && (
                      <>
                        {' · '}
                        <bdi dir="ltr">{session.ipAddress}</bdi>
                      </>
                    )}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="w-fit text-xs text-text-tertiary">
                        {session.isCurrent
                          ? t('activeNow')
                          : t('lastActive', { relativeTime: formatRelativeTime(lastActive, locale, t('activeNow')) })}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>{formatExactDateTime(format, lastActive)}</TooltipContent>
                  </Tooltip>
                  {session.isUnrecognizedClient && (
                    <p className="max-w-prose text-xs text-warning-emphasis">{t('unrecognizedClientHelp')}</p>
                  )}
                  {session.userAgent && (
                    <Accordion type="single" collapsible className="w-fit">
                      <AccordionItem value="details" className="border-0">
                        <AccordionTrigger className="py-1 text-xs font-normal text-text-tertiary">
                          {t('details')}
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          <bdi dir="ltr" className="block text-xs text-text-tertiary">
                            {session.userAgent}
                          </bdi>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start border-danger text-danger hover:bg-danger-subtle sm:self-center"
                  onClick={() => setPendingRevoke(session)}
                >
                  {t('revoke')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={pendingRevoke !== null} onOpenChange={(open) => !open && setPendingRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('revokeConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {pendingRevoke && t('revokeConfirmDescription', { device: pendingRevoke.displayName })}
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
    </TooltipProvider>
  );
}
