'use client';

import { AlertTriangle, Bell, HelpCircle, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';

const SUPPORT_EMAIL = 'ahmed.akram7474@gmail.com';

/**
 * The Prescriptions page's supporting sidebar — informational-only cards.
 * No "Manage reminders" / "Request refill" / "View guidelines" routes exist
 * anywhere in this app (no reminders feature, no refill-request feature, no
 * guidelines page), so those cards carry guidance copy with no CTA rather
 * than linking to a page that doesn't exist. Only "Contact support" gets a
 * real action — the same `mailto:` the shell's `HelpCenterCard` already
 * uses, the one genuinely reachable destination for medication questions
 * today.
 */
export function PrescriptionSidebar() {
  const t = useTranslations('patient.prescriptions.sidebar');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-lg border border-border-default bg-surface p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-subtle text-info-emphasis">
          <Icon icon={Bell} size="sm" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-text-primary">{t('remindersTitle')}</p>
          <p className="text-xs text-text-secondary">{t('remindersDescription')}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border-default bg-surface p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-emphasis">
          <Icon icon={Info} size="sm" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-text-primary">{t('howToTitle')}</p>
          <p className="text-xs text-text-secondary">{t('howToDescription')}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-warning-subtle bg-warning-subtle p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-warning-emphasis">
          <Icon icon={AlertTriangle} size="sm" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-warning-emphasis">{t('importantTitle')}</p>
          <p className="text-xs text-warning-emphasis">{t('importantDescription')}</p>
        </div>
      </div>

      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="flex items-start gap-3 rounded-lg border border-border-default bg-surface p-4 transition-colors duration-(--duration-fast) hover:bg-secondary-subtle"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-text-secondary">
          <Icon icon={HelpCircle} size="sm" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-text-primary">{t('questionsTitle')}</p>
          <p className="text-xs text-primary">{t('questionsCta')}</p>
        </div>
      </a>
    </div>
  );
}
