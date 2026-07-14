'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLogoutAllDevices } from '@/features/auth/hooks/use-logout-all';
import { useRouter } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
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

/** Ends every session, including the current one — after success there is no session left to view the Security Center with, so this redirects to `/login` rather than trying to stay on the page. */
export function LogoutAllDevicesButton() {
  const t = useTranslations('auth.securityCenter.logoutAll');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const logoutAll = useLogoutAllDevices();
  const router = useRouter();

  return (
    <>
      <Button variant="danger" onClick={() => setConfirmOpen(true)}>
        {t('trigger')}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription>{t('confirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={logoutAll.isPending}
              onClick={() => {
                logoutAll.mutate(undefined, {
                  onSuccess: () => {
                    router.replace('/login');
                  },
                  onError: () => {
                    toast({ description: t('error'), variant: 'danger' });
                  },
                });
              }}
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
