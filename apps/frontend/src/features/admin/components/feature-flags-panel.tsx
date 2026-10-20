'use client';

import { Activity, Bell, CheckCircle2, CircleDashed, CreditCard, FileCode2, Mail, Video, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAdminFeatureFlags } from '@/features/admin/hooks/use-feature-flags';
import type { FeatureFlags } from '@/features/admin/api/types';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';

const FLAGS: Array<{ key: keyof FeatureFlags; icon: LucideIcon }> = [
  { key: 'paymentGatewayConfigured', icon: CreditCard },
  { key: 'telemedicineConfigured', icon: Video },
  { key: 'emailProviderConfigured', icon: Mail },
  { key: 'notificationQueueConfigured', icon: Bell },
  { key: 'observabilityEnabled', icon: Activity },
  { key: 'openApiEnabled', icon: FileCode2 },
];

/**
 * Read-only visibility over already-real env-var-driven flags/provider
 * configuration (`GET /admin/feature-flags`) -- no new flags introduced, a
 * System Monitoring screen over what `env.schema.ts` already declares. A
 * card per setting says what it powers, so a "Disabled" reads as a
 * consequence (e.g. no video visits) rather than a bare status; the
 * user-facing services come first.
 */
export function FeatureFlagsPanel() {
  const t = useTranslations('admin.featureFlags');
  const { data, isLoading, isError } = useAdminFeatureFlags();

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {FLAGS.map(({ key }) => (
          <Skeleton key={key} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {FLAGS.map(({ key, icon }) => {
        const on = data[key];
        return (
          <li key={key} className="flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-secondary">
                <Icon icon={icon} size="sm" />
              </span>
              <Badge variant={on ? 'success' : 'neutral'}>
                <Icon icon={on ? CheckCircle2 : CircleDashed} size="xs" />
                {t(on ? 'enabled' : 'disabled')}
              </Badge>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-text-primary">{t(`labels.${key}`)}</p>
              <p className="text-xs text-text-secondary">{t(`descriptions.${key}`)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
