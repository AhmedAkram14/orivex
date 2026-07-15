'use client';

import { useTranslations } from 'next-intl';
import { EmptyState } from '@/shared/ui/empty-state';
import { Section } from '@/shared/ui/layout/section';

/**
 * Lab Results and Imaging — honestly not-yet-available placeholder
 * sections, per this milestone's explicit scope ("Lab results placeholder",
 * "Imaging placeholder"). No backend module exists for either yet; these
 * are architecture placeholders, not fabricated result data.
 */
export function LabImagingPlaceholders() {
  const t = useTranslations('patient.records');

  return (
    <>
      <Section title={t('labResults')}>
        <EmptyState title={t('labResultsUnavailableTitle')} description={t('labResultsUnavailableDescription')} />
      </Section>
      <Section title={t('imaging')}>
        <EmptyState title={t('imagingUnavailableTitle')} description={t('imagingUnavailableDescription')} />
      </Section>
    </>
  );
}
