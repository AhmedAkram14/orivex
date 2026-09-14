'use client';

import { ChevronRight, Headphones } from 'lucide-react';
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
 * The sidebar's bottom "get in touch" card. Every role with a real
 * Knowledge Center page (doctor/patient/super_admin) links straight there --
 * that page is the real help center this card used to only promise, not a
 * second, split destination beside the sidebar's own Knowledge Center nav
 * item one section up. A role with no dedicated Knowledge Center page
 * (hospital_admin/receptionist/nurse) falls back to the real `mailto:`,
 * same address the landing page's FAQ "Contact Support" button uses.
 */
export function HelpCenterCard() {
  const t = useTranslations('shell.helpCenter');
  const { user } = useAuth();
  const knowledgeHref = user?.roles.map((role) => KNOWLEDGE_CENTER_HREF_BY_ROLE[role]).find(Boolean);

  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
        <Icon icon={Headphones} size="sm" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-medium text-text-primary">{t('title')}</span>
        <span className="text-xs text-primary">{t('cta')}</span>
      </span>
      <Icon icon={ChevronRight} size="sm" flipRtl className="shrink-0 text-text-tertiary" />
    </>
  );

  const className =
    'flex items-center gap-3 rounded-lg bg-primary-subtle p-3 transition-colors duration-(--duration-fast) hover:bg-primary-subtle/70';

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
