'use client';

import { FlaskConical, ScanLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';

/**
 * Lab Results and Imaging — honestly not-yet-available placeholder
 * cards, per this milestone's explicit scope ("Lab results placeholder",
 * "Imaging placeholder"). No backend module exists for either yet; these
 * are architecture placeholders, not fabricated result data.
 *
 * Deliberately compact (a single-line icon + title + description each)
 * so two permanently-empty modules don't dominate the page the way the
 * old full-width `Section` + 48px-icon `EmptyState` pair did.
 */
export function LabImagingPlaceholders() {
  const t = useTranslations('patient.records');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border-default bg-surface p-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
          <Icon icon={FlaskConical} size="sm" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-text-primary">{t('labResults')}</p>
          <p className="text-xs text-text-tertiary">{t('labResultsUnavailableDescription')}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border-default bg-surface p-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
          <Icon icon={ScanLine} size="sm" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-text-primary">{t('imaging')}</p>
          <p className="text-xs text-text-tertiary">{t('imagingUnavailableDescription')}</p>
        </div>
      </div>
    </div>
  );
}
