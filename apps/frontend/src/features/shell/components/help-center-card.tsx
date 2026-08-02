'use client';

import { ChevronRight, Headphones } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';

/**
 * The sidebar's bottom "get in touch" card. No help-center page exists
 * anywhere in this app (same reality the landing page's footer/FAQ
 * already work around), so this is a real `mailto:` rather than a link to
 * a page that doesn't exist -- same address the landing page's FAQ
 * "Contact Support" button already uses.
 */
export function HelpCenterCard() {
  const t = useTranslations('shell.helpCenter');

  return (
    <a
      href="mailto:ahmed.akram7474@gmail.com"
      className="flex items-center gap-3 rounded-lg bg-primary-subtle p-3 transition-colors duration-(--duration-fast) hover:bg-primary-subtle/70"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
        <Icon icon={Headphones} size="sm" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-medium text-text-primary">{t('title')}</span>
        <span className="text-xs text-primary">{t('cta')}</span>
      </span>
      <Icon icon={ChevronRight} size="sm" flipRtl className="shrink-0 text-text-tertiary" />
    </a>
  );
}
