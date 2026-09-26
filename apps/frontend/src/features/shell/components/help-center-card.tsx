'use client';

import { ChevronRight, LifeBuoy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';

/** The landing page's FAQ (booking, refunds and disputes, contacting support) -- it ends with a support mailto. */
export const HELP_HREF = '/#faq';

/**
 * The sidebar's bottom help row (compact, one line), for every role. It opens
 * product help (the FAQ, with a support contact at its end), not the Knowledge
 * Center, which is health articles. When a dedicated help page exists, point
 * `HELP_HREF` at it.
 */
export function HelpCenterCard() {
  const t = useTranslations('chrome.help');

  return (
    <Link
      href={HELP_HREF}
      className="flex items-center gap-2.5 rounded-md px-3 py-2.5 transition-colors duration-(--duration-fast) hover:bg-surface-2 pointer-coarse:min-h-11"
    >
      <Icon icon={LifeBuoy} size="sm" className="shrink-0 text-text-tertiary" />
      <span className="flex-1 truncate text-small font-medium text-text-primary">{t('title')}</span>
      <Icon icon={ChevronRight} size="sm" flipRtl className="shrink-0 text-text-tertiary" />
    </Link>
  );
}
