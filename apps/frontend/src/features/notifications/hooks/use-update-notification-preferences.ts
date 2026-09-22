'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/hooks/query-keys';
import type { UpdateNotificationPreferencesRequest } from '@/features/notifications/api/types';
import { toUserMessage } from '@/shared/lib/api/error';
import { toast } from '@/shared/ui/use-toast';

/**
 * Doctor Settings Rebuild, Phase 4: backs the notification-preferences grid's
 * autosave-per-toggle behavior -- each call sends only the one field that
 * changed (PATCH semantics), so the toast/invalidation here fires per toggle,
 * not once for a whole form. Explicit onSuccess/onError toasts (rather than
 * relying solely on the global `MutationCache` error handler, which a plain
 * `new QueryClient()` in tests never has configured) match the plan's
 * explicit "immediate toast" requirement for this boolean grid, and reuse
 * `toUserMessage` -- the same error-message-extraction helper
 * `reportQueryError` itself uses -- for the danger toast's description.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const t = useTranslations('doctor.settingsPage.notifications');

  return useMutation({
    mutationFn: (request: UpdateNotificationPreferencesRequest) => notificationsApi.updatePreferences(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail('preferences') });
      toast({ description: t('saveSuccess'), variant: 'success' });
    },
    onError: (error) => {
      toast({ description: toUserMessage(error), variant: 'danger' });
    },
  });
}
