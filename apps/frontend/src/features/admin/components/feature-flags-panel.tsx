'use client';

import { useTranslations } from 'next-intl';
import { useAdminFeatureFlags } from '@/features/admin/hooks/use-feature-flags';
import type { FeatureFlags } from '@/features/admin/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';

const FLAG_KEYS: (keyof FeatureFlags)[] = [
  'observabilityEnabled',
  'openApiEnabled',
  'paymentGatewayConfigured',
  'telemedicineConfigured',
  'emailProviderConfigured',
  'notificationQueueConfigured',
];

/**
 * Read-only visibility over already-real env-var-driven flags/provider
 * configuration (`GET /admin/feature-flags`) -- no new flags introduced, a
 * System Monitoring screen over what `env.schema.ts` already declares.
 */
export function FeatureFlagsPanel() {
  const t = useTranslations('admin.featureFlags');
  const { data, isLoading, isError } = useAdminFeatureFlags();

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (isLoading || !data) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {FLAG_KEYS.map((key) => (
        <li
          key={key}
          className="flex items-center justify-between gap-3 rounded-lg border border-border-default p-3"
        >
          <span className="text-sm text-text-primary">{t(`labels.${key}`)}</span>
          <Badge variant={data[key] ? 'success' : 'neutral'}>{t(data[key] ? 'enabled' : 'disabled')}</Badge>
        </li>
      ))}
    </ul>
  );
}
