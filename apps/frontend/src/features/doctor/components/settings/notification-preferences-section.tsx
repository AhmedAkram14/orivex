'use client';

import { useTranslations } from 'next-intl';
import { useNotificationPreferences } from '@/features/notifications/hooks/use-notification-preferences';
import { useUpdateNotificationPreferences } from '@/features/notifications/hooks/use-update-notification-preferences';
import type { NotificationPreferences } from '@/features/notifications/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Skeleton } from '@/shared/ui/skeleton';

type PreferenceField = keyof NotificationPreferences;

interface CategoryRow {
  key: 'appointments' | 'billing';
  emailField: PreferenceField;
  inAppField: PreferenceField;
}

// The 2 real categories this module supports (Confirmed decision 1 /
// Phase 3 -- no Messages handler was confirmed to exist through this
// module, so only Appointments/Billing shipped).
const CATEGORY_ROWS: CategoryRow[] = [
  { key: 'appointments', emailField: 'emailAppointments', inAppField: 'inAppAppointments' },
  { key: 'billing', emailField: 'emailBilling', inAppField: 'inAppBilling' },
];

/**
 * Doctor Settings Rebuild, Phase 4: a small category x channel grid, each
 * cell autosaving immediately on change (Confirmed decision 9) -- no
 * separate Save button, unlike the larger numeric Consultation Defaults form
 * (a later phase). Not wired into the Settings page yet; that's Phase 6.
 */
export function NotificationPreferencesSection() {
  const t = useTranslations('doctor.settingsPage.notifications');
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  // Tracks which single field is currently in flight so only that one
  // toggle disables -- flipping one category shouldn't freeze the others,
  // and prevents spam-clicking the same toggle mid-request.
  const pendingField = updatePreferences.isPending
    ? (Object.keys(updatePreferences.variables ?? {})[0] as PreferenceField | undefined)
    : undefined;

  function handleToggle(field: PreferenceField, checked: boolean) {
    updatePreferences.mutate({ [field]: checked });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !preferences ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <table className="w-full text-sm text-text-primary">
            <thead>
              <tr>
                <th className="text-start font-medium text-text-secondary" />
                <th className="text-center font-medium text-text-secondary">{t('channels.email')}</th>
                <th className="text-center font-medium text-text-secondary">{t('channels.inApp')}</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ROWS.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="py-2 text-start font-normal">
                    {t(`categories.${row.key}`)}
                  </th>
                  <td className="py-2 text-center">
                    <Checkbox
                      aria-label={t('toggleLabel', {
                        category: t(`categories.${row.key}`),
                        channel: t('channels.email'),
                      })}
                      checked={preferences[row.emailField]}
                      disabled={pendingField === row.emailField}
                      onCheckedChange={(checked) => handleToggle(row.emailField, checked === true)}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <Checkbox
                      aria-label={t('toggleLabel', {
                        category: t(`categories.${row.key}`),
                        channel: t('channels.inApp'),
                      })}
                      checked={preferences[row.inAppField]}
                      disabled={pendingField === row.inAppField}
                      onCheckedChange={(checked) => handleToggle(row.inAppField, checked === true)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
