'use client';

import { ChevronRight, LifeBuoy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { env } from '@/shared/lib/env';

const KNOWLEDGE_CENTER_HREF_BY_ROLE: Partial<Record<string, string>> = {
  doctor: '/doctor/knowledge',
  patient: '/patient/knowledge',
  super_admin: '/admin/knowledge',
};

/**
 * The sidebar's bottom help row (compact, one line). Every role with a real
 * Knowledge Center page links straight there; a role with none
 * (hospital_admin/receptionist/nurse) falls back to the support `mailto:`.
 * PRODUCT QUESTION (flagged in the redesign report): the Knowledge Center is
 * the only real "help" destination today -- there is no dedicated help page.
 */
export function HelpCenterCard() {
  const t = useTranslations('chrome.help');
  const { user } = useAuth();
  const knowledgeHref = user?.roles.map((role) => KNOWLEDGE_CENTER_HREF_BY_ROLE[role]).find(Boolean);

  const content = (
    <>
      <Icon icon={LifeBuoy} size="sm" className="shrink-0 text-text-tertiary" />
      <span className="flex-1 truncate text-small font-medium text-text-primary">{t('title')}</span>
      <Icon icon={ChevronRight} size="sm" flipRtl className="shrink-0 text-text-tertiary" />
    </>
  );

  const className =
    'flex items-center gap-2.5 rounded-md px-3 py-2.5 transition-colors duration-(--duration-fast) hover:bg-surface-2 pointer-coarse:min-h-11';

  if (knowledgeHref) {
    return (
      <Link href={knowledgeHref} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href={`mailto:${env.supportEmail}`} className={className}>
      {content}
    </a>
  );
}
