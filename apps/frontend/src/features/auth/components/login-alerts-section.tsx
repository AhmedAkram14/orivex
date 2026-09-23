'use client';

import { useTranslations } from 'next-intl';
import { useNotificationPreferences } from '@/features/notifications/hooks/use-notification-preferences';
import { useUpdateNotificationPreferences } from '@/features/notifications/hooks/use-update-notification-preferences';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';

/**
 * Real feature (not a stub): a single standalone toggle bound to
 * NotificationPreference.emailNewDeviceLogin, autosaving immediately on
 * change -- same pattern as the doctor settings notification-preferences
 * grid (notification-preferences-section.tsx), just a single boolean
 * instead of a category x channel grid.
 */
export function LoginAlertsSection() {
  const t = useTranslations('auth.securityCenter.loginAlerts');
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  if (isLoading || !preferences) {
    return <Skeleton className="h-8 w-full" />;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-text-primary">{t('toggleLabel')}</p>
        <p className="text-sm text-text-secondary">{t('toggleDescription')}</p>
      </div>
      <Switch
        aria-label={t('toggleLabel')}
        checked={preferences.emailNewDeviceLogin}
        disabled={updatePreferences.isPending}
        onCheckedChange={(checked) => updatePreferences.mutate({ emailNewDeviceLogin: checked })}
      />
    </div>
  );
}
