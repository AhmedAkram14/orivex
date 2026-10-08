'use client';

import { Headphones, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { UserMenu } from '@/features/shell/components/user-menu';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { env } from '@/shared/lib/env';
import { Button } from '@/shared/ui/button';
import { Logo } from '@/shared/ui/logo';

export interface FocusedHeaderProps {
  /** A second line under the account name (e.g. "Doctor application · In progress"). */
  subtitle?: string;
  /** A way back into the app, for flows a user can leave and resume (verification, the doctor application). */
  exitHref?: string;
}

/**
 * The onboarding pages' own minimal chrome (role selection, patient intake, the doctor application, identity
 * verification): the logo at the inline start, "Need help? Contact support" and the account menu at the inline end,
 * and no sidebar -- these are focused steps, not workspace pages.
 */
export function FocusedHeader({ subtitle, exitHref }: FocusedHeaderProps) {
  const t = useTranslations('journey');
  const tCommon = useTranslations('common');

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-2 text-lg font-semibold text-text-primary">
        <Logo size="sm" />
        {tCommon('appName')}
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <a href={`mailto:${env.supportEmail}`} className="hidden items-center gap-2 sm:flex">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-text-secondary">
            <Icon icon={Headphones} size="sm" />
          </span>
          <span className="flex flex-col text-sm">
            <span className="text-text-secondary">{t('needHelp')}</span>
            <span className="font-medium text-text-primary">{t('contactSupport')}</span>
          </span>
        </a>
        <UserMenu showName subtitle={subtitle} />
        {exitHref && (
          <Button asChild variant="ghost" size="sm">
            <Link href={exitHref}>
              <Icon icon={X} size="sm" />
              {t('exit')}
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
