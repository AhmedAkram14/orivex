'use client';

import { useTranslations } from 'next-intl';
import { useRevokeOtherSessions } from '@/features/auth/hooks/use-revoke-other-sessions';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/use-toast';

/** Secondary action next to LogoutAllDevicesButton -- keeps the caller's own current session alive, unlike that button's "everything including this device". */
export function SignOutOtherDevicesButton() {
  const t = useTranslations('auth.securityCenter.logoutAll');
  const revokeOthers = useRevokeOtherSessions();

  return (
    <Button
      variant="outline"
      loading={revokeOthers.isPending}
      onClick={() => {
        revokeOthers.mutate(undefined, {
          onSuccess: () => {
            toast({ description: t('revokeOthersSuccess'), variant: 'success' });
          },
          onError: () => {
            toast({ description: t('revokeOthersError'), variant: 'danger' });
          },
        });
      }}
    >
      {t('revokeOthersTrigger')}
    </Button>
  );
}
